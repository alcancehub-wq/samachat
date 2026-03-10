import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import { getTracer, injectTraceContext } from '../observability/trace';
import type { NormalizedWebhookEvent } from '@samachat/messaging';
import type { InboundJobPayload } from './webhooks.types';
import { checkAndSetIdempotency, checkAndSetReplayProtection } from './idempotency';

@Injectable()
export class WebhooksService {
  private readonly logger = getLogger({ service: 'api', component: 'webhooks' });
  private readonly tracer = getTracer();
  private readonly redis?: IORedis;
  private readonly inboundQueue?: Queue<InboundJobPayload>;
  private readonly replayTtlSeconds = 5 * 60;

  constructor() {
    const { redisUrl } = getConfig();
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set; webhook queueing disabled');
      return;
    }

    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.inboundQueue = new Queue('inbound-events', { connection: this.redis });
  }

  async enqueueInboundEvent(
    event: NormalizedWebhookEvent,
    requestId: string,
    correlationId: string,
  ) {
    const inboundQueue = this.inboundQueue;
    if (!this.redis || !inboundQueue) {
      throw new ServiceUnavailableException('Webhook queueing unavailable');
    }
    const { webhook } = getConfig();
    const dedupeResult = await checkAndSetIdempotency(
      this.redis,
      event,
      requestId,
      webhook.idempotencyTtlSeconds,
    );

    if (!dedupeResult) {
      this.logger.info(
        { provider: event.provider, eventId: event.eventId, requestId, correlationId },
        'Webhook event deduplicated',
      );
      return { status: 'duplicate' as const, eventId: event.eventId };
    }

    await this.tracer.startActiveSpan('queue.enqueue inbound-events', async (span) => {
      const trace = injectTraceContext();
      await inboundQueue.add(
        'inbound-event',
        { event, requestId, correlationId, trace },
        { jobId: `${event.provider}:${event.eventId}` },
      );
      span.setAttribute('queue.name', 'inbound-events');
      span.setAttribute('event.id', event.eventId);
      span.end();
    });

    this.logger.info(
      { provider: event.provider, eventId: event.eventId, requestId, correlationId },
      'Inbound event queued',
    );

    return { status: 'queued' as const, eventId: event.eventId };
  }

  async ensureWebhookFreshness(params: {
    provider: NormalizedWebhookEvent['provider'];
    rawBody: string;
    timestampMs: number;
    signature?: string;
    requestId: string;
    correlationId: string;
  }) {
    const redis = this.redis;
    if (!redis) {
      throw new ServiceUnavailableException('Webhook security unavailable');
    }

    const replayAllowed = await checkAndSetReplayProtection(
      redis,
      params.provider,
      params.rawBody,
      params.timestampMs,
      params.signature,
      this.replayTtlSeconds,
    );

    if (!replayAllowed) {
      this.logger.warn(
        {
          provider: params.provider,
          requestId: params.requestId,
          correlationId: params.correlationId,
        },
        'Webhook replay rejected',
      );
      throw new UnauthorizedException('Replay detected');
    }
  }
}
