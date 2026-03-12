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
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import path from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MessageNormalizer } from './message.normalizer';
import { MessageProcessor } from './message.processor';
import { SessionManager } from '../connections/session.manager';
import { MessageDirection, MessageStatus, ConnectionStatus } from '@prisma/client';
import { getLogger } from '@samachat/logger';
import { getConfig } from '@samachat/config';
import { StorageService } from '../../storage/storage.service';
import { CONNECTIONS_REDIS } from '../connections/session.store';

@Injectable()
export class MessagesService {
  private readonly logger = getLogger({ service: 'api', component: 'messages' });
  private readonly outboundQueue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly normalizer: MessageNormalizer,
    private readonly processor: MessageProcessor,
    @Inject(forwardRef(() => SessionManager))
    private readonly sessionManager: SessionManager,
    private readonly storage: StorageService,
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
  ) {
    this.outboundQueue = new Queue('outbound-messages', { connection: this.redis });
  }

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
    senderUserId?: string | null;
    senderName?: string | null;
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

    const jid = this.buildJid(phone);
    const provider = getConfig().providerMode === 'waba' ? 'waba' : 'qr';
    this.logger.info(
      {
        tenantId: params.tenantId,
        conversationId: conversation.id,
        contactId: conversation.contact_id,
        jid,
        messageType,
      },
      'Sending WhatsApp outbound message',
    );

    const externalId = `outbound:${Date.now()}:${conversation.contact_id}`;

    const message = await this.prisma.message.create({
      data: {
        tenant_id: params.tenantId,
        conversation_id: conversation.id,
        contact_id: conversation.contact_id,
        sender_user_id: params.senderUserId ?? null,
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

    await this.processor.publishMessageSent({
      ...message,
      senderName: params.senderName ?? null,
    });

    await this.outboundQueue.add(
      'send-message',
      {
        provider,
        tenantId: params.tenantId,
        messageId: message.id,
        sessionId: session.session_id,
        connectionId: session.id,
        jid,
        text: params.content ?? '',
        type: messageType,
        mediaUrl: params.mediaUrl ?? null,
        mediaMime: params.mediaMime ?? null,
        mediaSize: params.mediaSize ?? null,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.info(
      {
        tenantId: params.tenantId,
        messageId: message.id,
        jid,
      },
      'QUEUE PUSH',
    );

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

  private buildJid(raw: string) {
    if (raw.includes('@')) {
      return raw;
    }

    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      return raw;
    }

    return `${digits}@c.us`;
  }

  async sendQueuedMessage(payload: {
    tenantId?: string;
    sessionId?: string;
    messageId?: string;
    jid: string;
    text: string;
    type?: string;
    mediaUrl?: string | null;
    mediaMime?: string | null;
    mediaSize?: number | null;
  }) {
    const tenantId = payload.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Missing tenantId');
    }

    const session = await this.prisma.whatsappSession.findFirst({
      where: {
        tenant_id: tenantId,
        status: ConnectionStatus.CONNECTED,
      },
    });

    if (!session) {
      throw new ServiceUnavailableException('No active WhatsApp session');
    }

    let client = this.sessionManager.getClientByTenant(tenantId);
    if (!client) {
      await this.sessionManager.startSession(session);
      client = await this.waitForClient(tenantId, 10, 500);
    }

    if (!client) {
      throw new ServiceUnavailableException('WhatsApp client unavailable');
    }

    const jid = this.buildJid(payload.jid);
    const mediaUrl = this.resolveMediaUrl(payload.mediaUrl ?? null);
    const sendPayload = this.buildSendPayload(
      payload.type ?? 'text',
      payload.text,
      mediaUrl,
      payload.mediaMime ?? undefined,
    );

    this.logger.info(
      { tenantId, messageId: payload.messageId, jid },
      'BAILEYS SEND (API)',
    );

    const response = await client.sendMessage(jid, sendPayload);
    const externalId = response?.key?.id;

    if (payload.messageId && externalId) {
      await this.prisma.message.update({
        where: { id: payload.messageId },
        data: { external_id: externalId, status: MessageStatus.SENT },
      });
    }

    return { externalId };
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

  private async waitForClient(tenantId: string, attempts: number, delayMs: number) {
    for (let index = 0; index < attempts; index += 1) {
      const client = this.sessionManager.getClientByTenant(tenantId);
      if (client) {
        return client;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
  }
}
