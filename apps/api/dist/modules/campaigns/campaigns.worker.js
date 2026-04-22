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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignsWorker = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const logger_1 = require("@samachat/logger");
const session_store_1 = require("../connections/session.store");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const messages_service_1 = require("../messages/messages.service");
const client_1 = require("@prisma/client");
let CampaignsWorker = class CampaignsWorker {
    redis;
    prisma;
    messagesService;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'campaign-worker' });
    rateLimit = this.readNumber('CAMPAIGN_MESSAGES_PER_SECOND', 5);
    queue;
    worker;
    constructor(redis, prisma, messagesService) {
        this.redis = redis;
        this.prisma = prisma;
        this.messagesService = messagesService;
    }
    async onModuleInit() {
        this.queue = new bullmq_1.Queue('campaign-dispatch', {
            connection: this.redis,
        });
        this.worker = new bullmq_1.Worker('campaign-dispatch', async (job) => this.handleDispatch(job), {
            connection: this.redis,
            limiter: {
                max: Math.max(this.rateLimit, 1),
                duration: 1000,
            },
        });
        this.worker.on('failed', (job, error) => {
            if (!job) {
                return;
            }
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ jobId: job.id, error: message }, 'Campaign job failed');
        });
    }
    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.queue) {
            await this.queue.close();
        }
    }
    async enqueueCampaignTargets(campaignId, targetIds) {
        if (!this.queue) {
            throw new Error('Campaign queue not initialized');
        }
        const jobs = targetIds.map((targetId) => ({
            name: 'dispatch',
            data: { campaignId, targetId },
            opts: {
                jobId: `${campaignId}:${targetId}`,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 1,
            },
        }));
        await this.queue.addBulk(jobs);
    }
    async handleDispatch(job) {
        const target = await this.prisma.campaignTarget.findUnique({
            where: { id: job.data.targetId },
            include: { campaign: true },
        });
        if (!target || target.campaign_id !== job.data.campaignId) {
            return { status: 'missing' };
        }
        if (target.status !== client_1.CampaignTargetStatus.pending) {
            return { status: 'skipped' };
        }
        if (target.campaign.status !== client_1.CampaignStatus.running) {
            return { status: 'paused' };
        }
        const media = this.resolveMedia(target.campaign.media_url ?? undefined);
        try {
            await this.messagesService.sendWhatsAppMessage({
                tenantId: target.campaign.tenant_id,
                conversationId: target.conversation_id,
                content: target.campaign.message_content,
                type: media.type,
                mediaUrl: target.campaign.media_url ?? null,
                mediaMime: media.mime,
            });
            await this.prisma.campaignTarget.update({
                where: { id: target.id },
                data: { status: client_1.CampaignTargetStatus.sent, sent_at: new Date() },
            });
            await this.checkCampaignCompletion(target.campaign_id);
            return { status: 'sent' };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ campaignId: target.campaign_id, targetId: target.id, error: message }, 'Campaign send failed');
            await this.prisma.campaignTarget.update({
                where: { id: target.id },
                data: { status: client_1.CampaignTargetStatus.failed },
            });
            await this.checkCampaignCompletion(target.campaign_id);
            return { status: 'failed' };
        }
    }
    async checkCampaignCompletion(campaignId) {
        const pending = await this.prisma.campaignTarget.count({
            where: { campaign_id: campaignId, status: client_1.CampaignTargetStatus.pending },
        });
        if (pending === 0) {
            await this.prisma.campaign.update({
                where: { id: campaignId },
                data: { status: client_1.CampaignStatus.completed },
            });
        }
    }
    resolveMedia(mediaUrl) {
        if (!mediaUrl) {
            return { type: 'text', mime: undefined };
        }
        const clean = mediaUrl.split('?')[0] ?? mediaUrl;
        const extension = clean.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'jpg':
            case 'jpeg':
                return { type: 'image', mime: 'image/jpeg' };
            case 'png':
                return { type: 'image', mime: 'image/png' };
            case 'mp4':
                return { type: 'video', mime: 'video/mp4' };
            case 'mp3':
                return { type: 'audio', mime: 'audio/mpeg' };
            case 'pdf':
                return { type: 'document', mime: 'application/pdf' };
            default:
                return { type: 'document', mime: undefined };
        }
    }
    readNumber(key, fallback) {
        const raw = process.env[key];
        if (!raw) {
            return fallback;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
};
exports.CampaignsWorker = CampaignsWorker;
exports.CampaignsWorker = CampaignsWorker = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function, prisma_service_1.PrismaService,
        messages_service_1.MessagesService])
], CampaignsWorker);
