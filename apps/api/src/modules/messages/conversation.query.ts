import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ConversationQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(tenantId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId },
      include: {
        contact: true,
        last_message: true,
      },
      orderBy: {
        last_message_at: 'desc',
      },
    });

    return conversations.map((conversation) => ({
      conversation_id: conversation.id,
      contact_name: conversation.contact.name,
      phone_number: conversation.contact.phone_number,
      last_message:
        conversation.last_message?.content ?? conversation.last_message?.body ?? null,
      last_message_at: this.toIsoString(
        conversation.last_message_at ?? conversation.last_message?.timestamp ?? null,
      ),
      unread_count: 0,
    }));
  }

  async listMessages(params: {
    tenantId: string;
    conversationId: string;
    limit?: number;
    cursor?: string;
  }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);

    const messages = await this.prisma.message.findMany({
      where: {
        tenant_id: params.tenantId,
        conversation_id: params.conversationId,
      },
      orderBy: {
        timestamp: 'asc',
      },
      take,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
    });

    const nextCursor = messages.length === take ? messages[messages.length - 1]?.id : null;

    return {
      items: messages.map((message) => ({
        message_id: message.id,
        direction: message.direction,
        content: message.content,
        type: message.type,
        media_url: message.media_url,
        media_mime: message.media_mime,
        media_size: message.media_size,
        timestamp: message.timestamp.toISOString(),
        status: message.status,
      })),
      next_cursor: nextCursor,
    };
  }

  private toIsoString(value: Date | null) {
    if (!value) {
      return null;
    }
    return value.toISOString();
  }
}
