import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type IORedis from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CONNECTIONS_REDIS } from '../connections/session.store';
import type { CreateLeadParams, CreateLeadResult } from './types';
import { getLogger } from '@samachat/logger';

@Injectable()
export class CrmService {
  private readonly logger = getLogger({ service: 'api', component: 'crm' });
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
  ) {}

  async createLead(params: CreateLeadParams): Promise<CreateLeadResult> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: params.conversation_id,
        tenant_id: params.tenant_id,
      },
      include: { contact: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.crm_contact_id || conversation.crm_deal_id) {
      return {
        contact_id: conversation.crm_contact_id || '',
        deal_id: conversation.crm_deal_id || '',
        pipeline_id: `pipeline:${params.user_id}`,
        already_linked: true,
      };
    }

    const contactId = this.createContact({
      tenantId: params.tenant_id,
      phoneNumber: conversation.contact.phone_number,
      name: conversation.contact.name,
      conversationId: conversation.id,
    });

    const dealId = this.createDeal({
      tenantId: params.tenant_id,
      contactId,
      conversationId: conversation.id,
    });

    const pipelineId = `pipeline:${params.user_id}`;

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        crm_contact_id: contactId,
        crm_deal_id: dealId,
      },
    });

    const result = {
      contact_id: contactId,
      deal_id: dealId,
      pipeline_id: pipelineId,
    };

    await this.redis.publish(
      'samachat.events',
      JSON.stringify({
        event: 'crm_deal_created',
        payload: {
          tenant_id: params.tenant_id,
          conversation_id: conversation.id,
          contact_id: conversation.contact_id,
          crm_contact_id: contactId,
          crm_deal_id: dealId,
          pipeline_id: pipelineId,
          timestamp: new Date().toISOString(),
        },
      }),
    );

    this.logger.info(
      { conversationId: conversation.id, crmDealId: dealId },
      'CRM lead created',
    );

    return result;
  }

  private createContact(params: {
    tenantId: string;
    phoneNumber: string;
    name: string | null;
    conversationId: string;
  }) {
    return `crm-contact:${randomUUID()}`;
  }

  private createDeal(params: {
    tenantId: string;
    contactId: string;
    conversationId: string;
  }) {
    return `crm-deal:${randomUUID()}`;
  }
}
