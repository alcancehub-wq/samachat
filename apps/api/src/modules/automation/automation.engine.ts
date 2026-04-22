import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type IORedis from 'ioredis';
import { getLogger } from '@samachat/logger';
import { CONNECTIONS_REDIS } from '../connections/session.store';
import { AutomationService } from './automation.service';
import { MessagesService } from '../messages/messages.service';
import { CrmService } from '../crm/crm.service';
import { PrismaService } from '../../common/prisma/prisma.service';

interface EventEnvelope {
  event?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AutomationEngine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'automation-engine' });
  private subscriber?: IORedis;

  constructor(
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
    private readonly automationService: AutomationService,
    private readonly messagesService: MessagesService,
    private readonly crmService: CrmService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redis.duplicate();
    await this.subscriber.subscribe('samachat.events');

    this.subscriber.on('message', (_channel, rawMessage) => {
      void this.handleEvent(rawMessage);
    });
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('samachat.events');
      await this.subscriber.quit();
    }
  }

  private async handleEvent(rawMessage: string) {
    let envelope: EventEnvelope;
    try {
      envelope = JSON.parse(rawMessage) as EventEnvelope;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ error: message }, 'Failed to parse automation event');
      return;
    }

    const event = envelope.event;
    const payload = envelope.payload ?? {};
    if (!event) {
      return;
    }

    const tenantId = await this.resolveTenantId(payload);
    const conversationId = payload.conversation_id as string | undefined;

    if (!tenantId) {
      this.logger.warn({ event }, 'Automation event missing tenant_id');
      return;
    }

    const automations = await this.automationService.listActiveByTrigger(tenantId, event);
    if (automations.length === 0) {
      return;
    }

    for (const automation of automations) {
      for (const action of automation.actions) {
        try {
          await this.executeAction({
            tenantId,
            conversationId,
            actionType: action.action_type,
            payload: action.payload as Record<string, unknown>,
          });
          await this.redis.publish(
            'samachat.events',
            JSON.stringify({
              event: 'automation_executed',
              payload: {
                tenant_id: tenantId,
                automation_id: automation.id,
                action_type: action.action_type,
                conversation_id: conversationId,
                timestamp: new Date().toISOString(),
              },
            }),
          );
          this.logger.info(
            { automationId: automation.id, action: action.action_type },
            'Automation action executed',
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            { automationId: automation.id, action: action.action_type, error: message },
            'Automation action failed',
          );
          await this.redis.publish(
            'samachat.events',
            JSON.stringify({
              event: 'automation_failed',
              payload: {
                tenant_id: tenantId,
                automation_id: automation.id,
                action_type: action.action_type,
                conversation_id: conversationId,
                error: message,
                timestamp: new Date().toISOString(),
              },
            }),
          );
        }
      }
    }
  }

  private async resolveTenantId(payload: Record<string, unknown>) {
    const direct = payload.tenant_id;
    if (typeof direct === 'string') {
      return direct;
    }

    const conversationId = payload.conversation_id;
    if (typeof conversationId !== 'string') {
      return null;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    return conversation?.tenant_id ?? null;
  }

  private async executeAction(params: {
    tenantId: string;
    conversationId?: string;
    actionType: string;
    payload: Record<string, unknown>;
  }) {
    if (params.actionType === 'send_message') {
      if (!params.conversationId) {
        throw new Error('Missing conversation_id for send_message');
      }
      const content = String(params.payload.content ?? '');
      if (!content) {
        return;
      }
      await this.messagesService.sendWhatsAppMessage({
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        content,
      });
      return;
    }

    if (params.actionType === 'create_crm_deal') {
      if (!params.conversationId) {
        throw new Error('Missing conversation_id for create_crm_deal');
      }
      await this.crmService.createLead({
        tenant_id: params.tenantId,
        user_id: 'automation',
        conversation_id: params.conversationId,
      });
      return;
    }

    if (params.actionType === 'call_webhook') {
      const url = String(params.payload.url ?? '');
      if (!url) {
        return;
      }
      const method = String(params.payload.method ?? 'POST').toUpperCase();
      const body = params.payload.body ?? params.payload;
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
  }
}
