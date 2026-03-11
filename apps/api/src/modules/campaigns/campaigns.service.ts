import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus, CampaignTargetStatus, ConversationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CampaignCreateInput, CampaignProgress, CampaignTargetSelection } from './types';
import { CampaignsWorker } from './campaigns.worker';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsWorker: CampaignsWorker,
  ) {}

  async listCampaigns(tenantId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });

    const progressMap = await this.getProgressMap(campaigns.map((campaign) => campaign.id));

    return campaigns.map((campaign) => ({
      ...campaign,
      progress: progressMap.get(campaign.id) ?? this.emptyProgress(),
    }));
  }

  async getCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const progress = await this.getProgress(id);
    return { ...campaign, progress };
  }

  async createCampaign(tenantId: string, input: CampaignCreateInput) {
    if (!input?.name?.trim()) {
      throw new BadRequestException('Campaign name is required');
    }
    if (!input.message_content?.trim()) {
      throw new BadRequestException('Message content is required');
    }
    if (!input.workspace_id) {
      throw new BadRequestException('Workspace is required');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: input.workspace_id },
    });
    if (!workspace || workspace.tenant_id !== tenantId) {
      throw new BadRequestException('Workspace not found');
    }

    const targets = await this.buildTargets(tenantId, input.targets);

    const campaign = await this.prisma.campaign.create({
      data: {
        tenant_id: tenantId,
        workspace_id: input.workspace_id,
        name: input.name.trim(),
        message_content: input.message_content.trim(),
        media_url: input.media_url ?? null,
        status: CampaignStatus.draft,
      },
    });

    if (targets.length > 0) {
      await this.prisma.campaignTarget.createMany({
        data: targets.map((target) => ({
          campaign_id: campaign.id,
          contact_id: target.contact_id,
          conversation_id: target.conversation_id,
          status: CampaignTargetStatus.pending,
        })),
        skipDuplicates: true,
      });
    }

    const progress = await this.getProgress(campaign.id);
    return { ...campaign, progress };
  }

  async startCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === CampaignStatus.completed) {
      return this.getCampaign(tenantId, id);
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.running },
    });

    const pendingTargets = await this.prisma.campaignTarget.findMany({
      where: { campaign_id: id, status: CampaignTargetStatus.pending },
      select: { id: true },
    });

    if (pendingTargets.length > 0) {
      await this.campaignsWorker.enqueueCampaignTargets(
        id,
        pendingTargets.map((target: { id: string }) => target.id),
      );
    }

    return this.getCampaign(tenantId, id);
  }

  async pauseCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.paused },
    });

    return this.getCampaign(tenantId, id);
  }

  private async buildTargets(tenantId: string, selection: CampaignTargetSelection) {
    if (selection.type === 'all') {
      const conversations = await this.prisma.conversation.findMany({
        where: { tenant_id: tenantId },
        orderBy: { last_message_at: 'desc' },
        distinct: ['contact_id'],
        select: { id: true, contact_id: true },
      });

      return conversations.map((conversation) => ({
        contact_id: conversation.contact_id,
        conversation_id: conversation.id,
      }));
    }

    if (selection.type === 'conversations') {
      const ids = selection.conversation_ids ?? [];
      if (ids.length === 0) {
        throw new BadRequestException('Conversation targets are required');
      }
      const conversations = await this.prisma.conversation.findMany({
        where: { tenant_id: tenantId, id: { in: ids } },
        select: { id: true, contact_id: true },
      });

      return conversations.map((conversation) => ({
        contact_id: conversation.contact_id,
        conversation_id: conversation.id,
      }));
    }

    const tagIds = selection.tag_ids ?? [];
    if (tagIds.length === 0) {
      throw new BadRequestException('Tag targets are required');
    }

    const contactTags = await this.prisma.contactTag.findMany({
      where: { tenant_id: tenantId, tag_id: { in: tagIds } },
      select: { contact_id: true },
    });

    const contactIds: string[] = Array.from(
      new Set(contactTags.map((item: { contact_id: string }) => item.contact_id)),
    );
    if (contactIds.length === 0) {
      return [];
    }

    const conversationMap = await this.resolveConversationsForContacts(tenantId, contactIds);

    return contactIds
      .map((contactId) => {
        const conversationId = conversationMap.get(contactId);
        if (!conversationId) {
          return null;
        }
        return {
          contact_id: contactId,
          conversation_id: conversationId,
        };
      })
      .filter(
        (entry): entry is { contact_id: string; conversation_id: string } => entry !== null,
      );
  }

  private async resolveConversationsForContacts(tenantId: string, contactIds: string[]) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId, contact_id: { in: contactIds } },
      orderBy: { last_message_at: 'desc' },
      distinct: ['contact_id'],
      select: { id: true, contact_id: true },
    });

    const map = new Map<string, string>();
    for (const conversation of conversations) {
      map.set(conversation.contact_id, conversation.id);
    }

    for (const contactId of contactIds) {
      if (map.has(contactId)) {
        continue;
      }
      const created = await this.prisma.conversation.create({
        data: {
          tenant_id: tenantId,
          contact_id: contactId,
          status: ConversationStatus.open,
        },
      });
      map.set(contactId, created.id);
    }

    return map;
  }

  private async getProgress(campaignId: string): Promise<CampaignProgress> {
    const rows = await this.prisma.campaignTarget.groupBy({
      by: ['status'],
      where: { campaign_id: campaignId },
      _count: { _all: true },
    });

    return this.buildProgress(
      rows.map((row: { status: CampaignTargetStatus; _count: { _all: number } }) => ({
        status: row.status,
        count: row._count._all,
      })),
    );
  }

  private async getProgressMap(campaignIds: string[]) {
    if (campaignIds.length === 0) {
      return new Map<string, CampaignProgress>();
    }

    const rows = await this.prisma.campaignTarget.groupBy({
      by: ['campaign_id', 'status'],
      where: { campaign_id: { in: campaignIds } },
      _count: { _all: true },
    });

    const map = new Map<string, CampaignProgress>();
    for (const row of rows) {
      const existing = map.get(row.campaign_id) ?? this.emptyProgress();
      const next = this.mergeProgress(existing, row.status, row._count._all);
      map.set(row.campaign_id, next);
    }

    for (const id of campaignIds) {
      if (!map.has(id)) {
        map.set(id, this.emptyProgress());
      }
    }

    return map;
  }

  private buildProgress(rows: Array<{ status: CampaignTargetStatus; count: number }>) {
    return rows.reduce(
      (acc, row) => this.mergeProgress(acc, row.status, row.count),
      this.emptyProgress(),
    );
  }

  private mergeProgress(progress: CampaignProgress, status: CampaignTargetStatus, count: number) {
    const next = { ...progress };
    if (status === CampaignTargetStatus.sent) {
      next.sent += count;
    } else if (status === CampaignTargetStatus.failed) {
      next.failed += count;
    } else {
      next.pending += count;
    }
    next.total_targets = next.sent + next.failed + next.pending;
    return next;
  }

  private emptyProgress(): CampaignProgress {
    return { total_targets: 0, sent: 0, failed: 0, pending: 0 };
  }
}
