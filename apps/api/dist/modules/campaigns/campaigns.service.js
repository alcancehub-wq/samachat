"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const campaigns_worker_1 = require("./campaigns.worker");
let CampaignsService = class CampaignsService {
    prisma;
    campaignsWorker;
    constructor(prisma, campaignsWorker) {
        this.prisma = prisma;
        this.campaignsWorker = campaignsWorker;
    }
    async listCampaigns(tenantId) {
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
    async getCampaign(tenantId, id) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        const progress = await this.getProgress(id);
        return { ...campaign, progress };
    }
    async createCampaign(tenantId, input, actorId) {
        if (!input?.name?.trim()) {
            throw new common_1.BadRequestException('Campaign name is required');
        }
        const hasMessage = Boolean(input.message_content?.trim());
        const hasDialog = Boolean(input.dialog_id);
        if (!hasMessage && !hasDialog) {
            throw new common_1.BadRequestException('Message content or dialog is required');
        }
        if (!input.workspace_id) {
            throw new common_1.BadRequestException('Workspace is required');
        }
        if (!input.start_at) {
            throw new common_1.BadRequestException('Start date is required');
        }
        if (!Number.isFinite(input.interval_seconds) || input.interval_seconds <= 0) {
            throw new common_1.BadRequestException('Interval is required');
        }
        if (!input.warning_acknowledged) {
            throw new common_1.BadRequestException('Campaign warning acknowledgement is required');
        }
        const startAt = new Date(input.start_at);
        if (Number.isNaN(startAt.getTime())) {
            throw new common_1.BadRequestException('Start date is invalid');
        }
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: input.workspace_id },
        });
        if (!workspace || workspace.tenant_id !== tenantId) {
            throw new common_1.BadRequestException('Workspace not found');
        }
        let dialogMessage = null;
        let dialogMedia = null;
        if (hasDialog) {
            const dialog = await this.prisma.dialog.findFirst({
                where: { id: input.dialog_id, tenant_id: tenantId },
            });
            if (!dialog) {
                throw new common_1.BadRequestException('Dialog not found');
            }
            if (dialog.type === 'automation') {
                throw new common_1.BadRequestException('Automation dialog is not allowed in campaigns');
            }
            dialogMessage = dialog.message_text ?? null;
            dialogMedia = dialog.media_url ?? null;
            if (!hasMessage && dialog.type === 'message' && !dialogMessage) {
                throw new common_1.BadRequestException('Dialog message content is empty');
            }
        }
        const targets = await this.buildTargets(tenantId, input.targets);
        const campaign = await this.prisma.campaign.create({
            data: {
                tenant_id: tenantId,
                workspace_id: input.workspace_id,
                dialog_id: input.dialog_id ?? null,
                name: input.name.trim(),
                message_content: hasMessage ? input.message_content.trim() : dialogMessage ?? '',
                media_url: input.media_url ?? dialogMedia ?? null,
                start_at: startAt,
                interval_seconds: Math.floor(input.interval_seconds),
                status: client_1.CampaignStatus.draft,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                tenant_id: tenantId,
                actor_id: actorId ?? null,
                action: 'campaign_created',
                entity: 'campaign',
                entity_id: campaign.id,
                metadata: {
                    warning_version: input.warning_version ?? null,
                    warning_acknowledged: true,
                },
            },
        });
        if (targets.length > 0) {
            await this.prisma.campaignTarget.createMany({
                data: targets.map((target) => ({
                    campaign_id: campaign.id,
                    contact_id: target.contact_id,
                    conversation_id: target.conversation_id,
                    status: client_1.CampaignTargetStatus.pending,
                })),
                skipDuplicates: true,
            });
        }
        const progress = await this.getProgress(campaign.id);
        return { ...campaign, progress };
    }
    async startCampaign(tenantId, id) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        if (campaign.status === client_1.CampaignStatus.completed) {
            return this.getCampaign(tenantId, id);
        }
        await this.prisma.campaign.update({
            where: { id },
            data: { status: client_1.CampaignStatus.running },
        });
        const pendingTargets = await this.prisma.campaignTarget.findMany({
            where: { campaign_id: id, status: client_1.CampaignTargetStatus.pending },
            select: { id: true },
        });
        if (pendingTargets.length > 0) {
            await this.campaignsWorker.enqueueCampaignTargets(id, pendingTargets.map((target) => target.id));
        }
        return this.getCampaign(tenantId, id);
    }
    async pauseCampaign(tenantId, id) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        await this.prisma.campaign.update({
            where: { id },
            data: { status: client_1.CampaignStatus.paused },
        });
        return this.getCampaign(tenantId, id);
    }
    async deleteCampaign(tenantId, id, actorId) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!campaign) {
            throw new common_1.NotFoundException('Campaign not found');
        }
        await this.prisma.campaignTarget.deleteMany({
            where: { campaign_id: campaign.id },
        });
        await this.prisma.campaign.delete({
            where: { id: campaign.id },
        });
        await this.prisma.auditLog.create({
            data: {
                tenant_id: tenantId,
                actor_id: actorId ?? null,
                action: 'campaign_deleted',
                entity: 'campaign',
                entity_id: campaign.id,
            },
        });
        return { id: campaign.id };
    }
    async buildTargets(tenantId, selection) {
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
                throw new common_1.BadRequestException('Conversation targets are required');
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
            throw new common_1.BadRequestException('Tag targets are required');
        }
        const contactTags = await this.prisma.contactTag.findMany({
            where: { tenant_id: tenantId, tag_id: { in: tagIds } },
            select: { contact_id: true },
        });
        const contactIds = Array.from(new Set(contactTags.map((item) => item.contact_id)));
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
            .filter((entry) => entry !== null);
    }
    async resolveConversationsForContacts(tenantId, contactIds) {
        const conversations = await this.prisma.conversation.findMany({
            where: { tenant_id: tenantId, contact_id: { in: contactIds } },
            orderBy: { last_message_at: 'desc' },
            distinct: ['contact_id'],
            select: { id: true, contact_id: true },
        });
        const map = new Map();
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
                    status: client_1.ConversationStatus.open,
                },
            });
            map.set(contactId, created.id);
        }
        return map;
    }
    async getProgress(campaignId) {
        const rows = await this.prisma.campaignTarget.groupBy({
            by: ['status'],
            where: { campaign_id: campaignId },
            _count: { _all: true },
        });
        return this.buildProgress(rows.map((row) => ({
            status: row.status,
            count: row._count._all,
        })));
    }
    async getProgressMap(campaignIds) {
        if (campaignIds.length === 0) {
            return new Map();
        }
        const rows = await this.prisma.campaignTarget.groupBy({
            by: ['campaign_id', 'status'],
            where: { campaign_id: { in: campaignIds } },
            _count: { _all: true },
        });
        const map = new Map();
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
    buildProgress(rows) {
        return rows.reduce((acc, row) => this.mergeProgress(acc, row.status, row.count), this.emptyProgress());
    }
    mergeProgress(progress, status, count) {
        const next = { ...progress };
        if (status === client_1.CampaignTargetStatus.sent) {
            next.sent += count;
        }
        else if (status === client_1.CampaignTargetStatus.failed) {
            next.failed += count;
        }
        else {
            next.pending += count;
        }
        next.total_targets = next.sent + next.failed + next.pending;
        return next;
    }
    emptyProgress() {
        return { total_targets: 0, sent: 0, failed: 0, pending: 0 };
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        campaigns_worker_1.CampaignsWorker])
], CampaignsService);
