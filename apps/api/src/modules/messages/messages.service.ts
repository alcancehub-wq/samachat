import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { proto } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import path from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MessageNormalizer } from './message.normalizer';
import { MessageProcessor } from './message.processor';
import { SessionManager } from '../connections/session.manager';
import { MessageDirection, MessageStatus, ConnectionStatus } from '@prisma/client';
import { getLogger } from '@samachat/logger';
import { getConfig } from '@samachat/config';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class MessagesService {
  private readonly logger = getLogger({ service: 'api', component: 'messages' });

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: MessageNormalizer,
    private readonly processor: MessageProcessor,
    @Inject(forwardRef(() => SessionManager))
    private readonly sessionManager: SessionManager,
    private readonly storage: StorageService,
  ) {}

  async processIncomingMessage(sessionId: string, message: proto.IWebMessageInfo) {
    const normalized = this.normalizer.normalize(message);
    if (!normalized) {
      return;
    }

    const session = await this.prisma.whatsappSession.findUnique({
      where: { session_id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (normalized.mediaType && normalized.mediaType !== 'text' && normalized.mediaType !== 'unknown') {
      const client = this.sessionManager.getClientByTenant(session.tenant_id);
      const mediaUrl = await this.downloadAndStoreMedia(message, normalized, client?.updateMediaMessage);
      normalized.mediaUrl = mediaUrl;
    }

    await this.processor.processInboundMessage(session.tenant_id, normalized);
  }

  async createOutboundPlaceholder(params: {
    tenantId: string;
    contactPhone: string;
    content?: string | null;
    externalId?: string;
    messageType?: string;
    mediaUrl?: string | null;
    mediaMime?: string | null;
    mediaSize?: number | null;
  }) {
    return this.processor.createOutboundPlaceholder(params);
  }

  async sendWhatsAppMessage(params: {
    tenantId: string;
    conversationId: string;
    content?: string;
    phoneNumber?: string;
    type?: string;
    mediaUrl?: string | null;
    mediaMime?: string | null;
    mediaSize?: number | null;
  }) {
    const messageType = params.type ?? 'text';
    const allowedTypes = ['text', 'image', 'video', 'audio', 'document'];
    if (!allowedTypes.includes(messageType)) {
      throw new BadRequestException('Unsupported message type');
    }
    if (messageType === 'text' && (!params.content || params.content.trim().length === 0)) {
      throw new BadRequestException('Content is required');
    }

    if (messageType !== 'text' && !params.mediaUrl) {
      throw new BadRequestException('Media URL is required');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        tenant_id: params.tenantId,
      },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const phone = params.phoneNumber || conversation.contact.phone_number;
    if (!phone) {
      throw new BadRequestException('Phone number not available');
    }

    const session = await this.prisma.whatsappSession.findFirst({
      where: {
        tenant_id: params.tenantId,
        status: ConnectionStatus.CONNECTED,
      },
    });

    if (!session) {
      throw new ServiceUnavailableException('No active WhatsApp session');
    }

    const client = this.sessionManager.getClientByTenant(params.tenantId);
    if (!client) {
      throw new ServiceUnavailableException('WhatsApp client unavailable');
    }

    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    const mediaUrl = this.resolveMediaUrl(params.mediaUrl);
    const sendPayload = this.buildSendPayload(
      messageType,
      params.content,
      mediaUrl,
      params.mediaMime ?? undefined,
    );
    const response = await client.sendMessage(jid, sendPayload);
    const externalId = response?.key?.id || `outbound:${Date.now()}:${conversation.contact_id}`;

    const message = await this.prisma.message.create({
      data: {
        tenant_id: params.tenantId,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id,
        direction: MessageDirection.OUTBOUND,
        type: messageType,
        content: params.content ?? null,
        media_url: params.mediaUrl ?? null,
        media_type: messageType === 'text' ? null : messageType,
        media_mime: params.mediaMime ?? null,
        media_size: params.mediaSize ?? null,
        status: MessageStatus.SENT,
        external_id: externalId,
        timestamp: new Date(),
        body: params.content ?? (messageType !== 'text' ? `[${messageType}]` : ''),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message_id: message.id,
        last_message_at: message.timestamp,
      },
    });

    await this.processor.publishMessageSent(message);

    this.logger.info(
      { conversationId: conversation.id, messageId: message.id },
      'Outbound message sent',
    );

    return message;
  }

  async updateMessageStatus(externalId: string, status: MessageStatus) {
    await this.processor.updateMessageStatus(externalId, status);

    if (status === MessageStatus.FAILED) {
      const message = await this.prisma.message.findUnique({
        where: { external_id: externalId },
      });
      if (message) {
        await this.processor.publishMessageFailed({
          tenant_id: message.tenant_id,
          id: message.id,
          conversation_id: message.conversation_id,
          contact_id: message.contact_id,
          content: message.content,
          type: message.type,
          media_url: message.media_url,
          media_mime: message.media_mime,
          media_size: message.media_size,
          timestamp: message.timestamp,
        });
        this.logger.warn({ messageId: message.id }, 'Outbound message failed');
      }
    }
  }

  private async downloadAndStoreMedia(
    message: proto.IWebMessageInfo,
    normalized: {
      mediaMime?: string | null;
      mediaSize?: number | null;
      mediaFileName?: string | null;
      mediaExtension?: string | null;
    },
    reuploadRequest?: (message: proto.IWebMessageInfo) => Promise<proto.IWebMessageInfo>,
  ) {
    try {
      const downloaded = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: this.logger,
          reuploadRequest: reuploadRequest
            ? reuploadRequest
            : async () => {
                throw new Error('Media reupload unavailable');
              },
        },
      );

      const buffer = Buffer.isBuffer(downloaded)
        ? downloaded
        : Buffer.from(downloaded as ArrayBuffer);

      const result = await this.storage.saveMedia(buffer, {
        filename: normalized.mediaFileName ?? undefined,
        contentType: normalized.mediaMime ?? undefined,
        sizeBytes: normalized.mediaSize ?? undefined,
        extension: normalized.mediaExtension ?? undefined,
      });

      return result.publicUrl;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ error: messageText }, 'Failed to download media');
      return null;
    }
  }

  private buildSendPayload(
    type: string,
    content?: string,
    mediaUrl?: string | null,
    mediaMime?: string,
  ) {
    switch (type) {
      case 'image':
        return { image: { url: mediaUrl ?? '' }, caption: content };
      case 'video':
        return { video: { url: mediaUrl ?? '' }, caption: content };
      case 'audio':
        return { audio: { url: mediaUrl ?? '' }, mimetype: mediaMime };
      case 'document':
        return {
          document: { url: mediaUrl ?? '' },
          caption: content,
          mimetype: mediaMime || 'application/pdf',
        };
      default:
        return { text: content ?? '' };
    }
  }

  private resolveMediaUrl(url?: string | null) {
    if (!url) {
      return null;
    }
    if (url.startsWith('/media/')) {
      const storageKey = url.replace('/media/', '');
      const { storageLocalPath } = getConfig();
      return path.resolve(storageLocalPath, storageKey);
    }
    return url;
  }
}
