import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type IORedis from 'ioredis';
import { getLogger } from '@samachat/logger';
import { CONNECTIONS_REDIS } from '../connections/session.store';
import { InboxGateway } from './inbox.gateway';

interface EventEnvelope {
  event?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class InboxRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'inbox-realtime' });
  private subscriber?: IORedis;

  constructor(
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
    private readonly gateway: InboxGateway,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe('samachat.events');

    this.subscriber.on('message', (_channel, rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage) as EventEnvelope;
        const event = parsed.event;
        const payload = parsed.payload ?? {};

        if (event === 'message_received') {
          this.gateway.emitMessageReceived(payload);
        }

        if (event === 'message_sent') {
          this.gateway.emitMessageSent(payload);
        }

        if (event === 'message_received' || event === 'message_sent') {
          const conversationId = payload.conversation_id as string | undefined;
          if (conversationId) {
            this.gateway.emitConversationUpdated({ conversation_id: conversationId });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ error: message }, 'Failed to parse inbox event');
      }
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('samachat.events');
      await this.subscriber.quit();
    }
  }
}
