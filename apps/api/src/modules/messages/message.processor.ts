import { Inject, Injectable } from '@nestjs/common';
import type IORedis from 'ioredis';
import {
  Prisma,
  MessageDirection,
  ConversationStatus,
  MessageStatus,
} from '@prisma/client';
import { getLogger } from '@samachat/logger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CONNECTIONS_REDIS } from '../connections/session.store';
import type { NormalizedMessage, MessageEventPayload } from './types';

@Injectable()
export class MessageProcessor {
  private readonly logger = getLogger({ service: 'api', component: 'messages' });
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
  ) {}

  async processInboundMessage(tenantId: string, normalized: NormalizedMessage) {
    const contact = await this.prisma.contact.upsert({
      where: { phone_number: normalized.phoneNumber },
      update: {},
      create: {
        phone_number: normalized.phoneNumber,
        name: null,
      },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenant_id: tenantId,
        contact_id: contact.id,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenant_id: tenantId,
          contact_id: contact.id,
          status: ConversationStatus.open,
        },
      });
      await this.publishConversationCreated({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
      });
    }

    const bodyFallback = normalized.mediaType ? `[${normalized.mediaType}]` : '';
    let message;
    try {
      message = await this.prisma.message.create({
        data: {
          tenant_id: tenantId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          direction: MessageDirection.INBOUND,
          type: normalized.messageType,
          content: normalized.messageText,
          media_url: normalized.mediaUrl ?? null,
          media_type: normalized.mediaType ?? null,
          media_mime: normalized.mediaMime ?? null,
          media_size: normalized.mediaSize ?? null,
          status: MessageStatus.DELIVERED,
          external_id: normalized.externalId,
          timestamp: normalized.timestamp,
          body: normalized.messageText || bodyFallback,
        },
      });
    } catch (error) {
      if (this.isDuplicateError(error)) {
        return;
      }
      throw error;
    }

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message_id: message.id,
        last_message_at: message.timestamp,
      },
    });

    const payload: MessageEventPayload = {
      tenant_id: tenantId,
      conversation_id: conversation.id,
      contact_id: contact.id,
      message_id: message.id,
      direction: message.direction,
      content: message.content,
      type: message.type,
      media_url: message.media_url,
      media_mime: message.media_mime,
      media_size: message.media_size,
      timestamp: message.timestamp.toISOString(),
    };

    await this.redis.publish('samachat.events', JSON.stringify({
      event: 'message_received',
      payload,
    }));

    this.logger.info(
      { conversationId: conversation.id, messageId: message.id },
      'Inbound message received',
    );
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
    const contact = await this.prisma.contact.upsert({
      where: { phone_number: params.contactPhone },
      update: {},
      create: { phone_number: params.contactPhone, name: null },
    });

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenant_id: params.tenantId,
        contact_id: contact.id,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenant_id: params.tenantId,
          contact_id: contact.id,
          status: ConversationStatus.open,
        },
      });
      await this.publishConversationCreated({
        tenant_id: params.tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
      });
    }

    const message = await this.prisma.message.create({
      data: {
        tenant_id: params.tenantId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        direction: MessageDirection.OUTBOUND,
        type: params.messageType || 'text',
        content: params.content ?? null,
        media_url: params.mediaUrl ?? null,
        media_type: params.messageType && params.messageType !== 'text' ? params.messageType : null,
        media_mime: params.mediaMime ?? null,
        media_size: params.mediaSize ?? null,
        status: MessageStatus.PENDING,
        external_id: params.externalId || `outbound:${Date.now()}:${contact.id}`,
        timestamp: new Date(),
        body: params.content ?? (params.messageType && params.messageType !== 'text'
          ? `[${params.messageType}]`
          : ''),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message_id: message.id,
        last_message_at: message.timestamp,
      },
    });

    return message;
  }

  async updateMessageStatus(externalId: string, status: MessageStatus) {
    await this.prisma.message.updateMany({
      where: { external_id: externalId },
      data: { status },
    });
  }

  async publishMessageSent(message: {
    tenant_id: string;
    id: string;
    conversation_id: string;
    contact_id: string;
    direction: MessageDirection;
    content: string | null;
    timestamp: Date;
    type?: string | null;
    media_url?: string | null;
    media_mime?: string | null;
    media_size?: number | null;
  }) {
    const payload: MessageEventPayload = {
      tenant_id: message.tenant_id,
      conversation_id: message.conversation_id,
      contact_id: message.contact_id,
      message_id: message.id,
      direction: message.direction,
      content: message.content,
      type: message.type ?? undefined,
      media_url: message.media_url ?? undefined,
      media_mime: message.media_mime ?? undefined,
      media_size: message.media_size ?? undefined,
      timestamp: message.timestamp.toISOString(),
    };

    await this.redis.publish(
      'samachat.events',
      JSON.stringify({
        event: 'message_sent',
        payload,
      }),
    );
  }

  async publishMessageFailed(message: {
    tenant_id: string;
    id: string;
    conversation_id: string;
    contact_id: string;
    content: string | null;
    timestamp: Date;
    type?: string | null;
    media_url?: string | null;
    media_mime?: string | null;
    media_size?: number | null;
  }) {
    await this.redis.publish(
      'samachat.events',
      JSON.stringify({
        event: 'message_failed',
        payload: {
          tenant_id: message.tenant_id,
          conversation_id: message.conversation_id,
          contact_id: message.contact_id,
          message_id: message.id,
          content: message.content,
          type: message.type ?? undefined,
          media_url: message.media_url ?? undefined,
          media_mime: message.media_mime ?? undefined,
          media_size: message.media_size ?? undefined,
          timestamp: message.timestamp.toISOString(),
        },
      }),
    );
  }

  private async publishConversationCreated(payload: {
    tenant_id: string;
    conversation_id: string;
    contact_id: string;
  }) {
    await this.redis.publish(
      'samachat.events',
      JSON.stringify({
        event: 'conversation_created',
        payload: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }

  private isDuplicateError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
