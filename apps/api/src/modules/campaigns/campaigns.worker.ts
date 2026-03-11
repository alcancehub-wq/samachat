import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { getLogger } from '@samachat/logger';
import { CONNECTIONS_REDIS } from '../connections/session.store';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { CampaignStatus, CampaignTargetStatus } from '@prisma/client';

interface CampaignDispatchJob {
  campaignId: string;
  targetId: string;
}

@Injectable()
export class CampaignsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'campaign-worker' });
  private readonly rateLimit = this.readNumber('CAMPAIGN_MESSAGES_PER_SECOND', 5);
  private queue?: Queue<CampaignDispatchJob>;
  private worker?: Worker<CampaignDispatchJob>;

  constructor(
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
  ) {}

  async onModuleInit() {
    this.queue = new Queue<CampaignDispatchJob>('campaign-dispatch', {
      connection: this.redis,
    });

    this.worker = new Worker<CampaignDispatchJob>(
      'campaign-dispatch',
      async (job) => this.handleDispatch(job),
      {
        connection: this.redis,
        limiter: {
          max: Math.max(this.rateLimit, 1),
          duration: 1000,
        },
      },
    );

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

  async enqueueCampaignTargets(campaignId: string, targetIds: string[]) {
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

  private async handleDispatch(job: Job<CampaignDispatchJob>) {
    const target = await this.prisma.campaignTarget.findUnique({
      where: { id: job.data.targetId },
      include: { campaign: true },
    });

    if (!target || target.campaign_id !== job.data.campaignId) {
      return { status: 'missing' };
    }

    if (target.status !== CampaignTargetStatus.pending) {
      return { status: 'skipped' };
    }

    if (target.campaign.status !== CampaignStatus.running) {
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
        data: { status: CampaignTargetStatus.sent, sent_at: new Date() },
      });

      await this.checkCampaignCompletion(target.campaign_id);
      return { status: 'sent' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn({ campaignId: target.campaign_id, targetId: target.id, error: message }, 'Campaign send failed');
      await this.prisma.campaignTarget.update({
        where: { id: target.id },
        data: { status: CampaignTargetStatus.failed },
      });
      await this.checkCampaignCompletion(target.campaign_id);
      return { status: 'failed' };
    }
  }

  private async checkCampaignCompletion(campaignId: string) {
    const pending = await this.prisma.campaignTarget.count({
      where: { campaign_id: campaignId, status: CampaignTargetStatus.pending },
    });

    if (pending === 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.completed },
      });
    }
  }

  private resolveMedia(mediaUrl?: string) {
    if (!mediaUrl) {
      return { type: 'text', mime: undefined as string | undefined };
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

  private readNumber(key: string, fallback: number) {
    const raw = process.env[key];
    if (!raw) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
