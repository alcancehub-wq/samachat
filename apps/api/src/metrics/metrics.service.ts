import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { Registry, collectDefaultMetrics, Gauge, Counter } from 'prom-client';
import { getConfig } from '@samachat/config';
import { createQueueClients } from '../observability/queues';

const METRIC_PREFIX = 'samachat';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly redis?: IORedis;
  private readonly queues: Queue[] = [];
  private readonly queueDepthGauge: Gauge<string>;
  private readonly queueCompletedGauge: Gauge<string>;
  private readonly queueFailedGauge: Gauge<string>;
  private readonly queueRetriesGauge: Gauge<string>;
  private readonly queueDlqGauge: Gauge<string>;
  private readonly messagesReceivedCounter: Counter<string>;
  private readonly messagesSentCounter: Counter<string>;
  private readonly automationExecutionsCounter: Counter<string>;
  private readonly eventsProcessedCounter: Counter<string>;
  private readonly eventsFailedCounter: Counter<string>;
  private readonly connectionsGauge: Gauge<string>;
  private readonly connectionsPerWorkerGauge: Gauge<string>;
  private readonly workerLoadGauge: Gauge<string>;
  private readonly reconnectEventsCounter: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: `${METRIC_PREFIX}_` });

    this.queueDepthGauge = new Gauge({
      name: `${METRIC_PREFIX}_queue_depth`,
      help: 'Approximate queue depth (waiting + active + delayed).',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueCompletedGauge = new Gauge({
      name: `${METRIC_PREFIX}_queue_jobs_completed_total`,
      help: 'Total jobs completed, tracked by worker events.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueFailedGauge = new Gauge({
      name: `${METRIC_PREFIX}_queue_jobs_failed_total`,
      help: 'Total jobs failed after retries, tracked by worker events.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueRetriesGauge = new Gauge({
      name: `${METRIC_PREFIX}_queue_retries_total`,
      help: 'Total job retries, tracked by worker events.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueDlqGauge = new Gauge({
      name: `${METRIC_PREFIX}_queue_dlq_size`,
      help: 'Dead-letter queue size.',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.messagesReceivedCounter = new Counter({
      name: `${METRIC_PREFIX}_messages_received_total`,
      help: 'Total inbound messages received.',
      registers: [this.registry],
    });

    this.messagesSentCounter = new Counter({
      name: `${METRIC_PREFIX}_messages_sent_total`,
      help: 'Total outbound messages sent.',
      registers: [this.registry],
    });

    this.automationExecutionsCounter = new Counter({
      name: `${METRIC_PREFIX}_automation_executions_total`,
      help: 'Total automation actions executed.',
      registers: [this.registry],
    });

    this.eventsProcessedCounter = new Counter({
      name: `${METRIC_PREFIX}_events_processed_total`,
      help: 'Total events processed from Redis pipeline.',
      registers: [this.registry],
    });

    this.eventsFailedCounter = new Counter({
      name: `${METRIC_PREFIX}_events_failed_total`,
      help: 'Total events failed while processing.',
      registers: [this.registry],
    });

    this.connectionsGauge = new Gauge({
      name: `${METRIC_PREFIX}_active_connections`,
      help: 'Active WhatsApp connections by status.',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.connectionsPerWorkerGauge = new Gauge({
      name: `${METRIC_PREFIX}_connections_per_worker`,
      help: 'Active WhatsApp connections per worker.',
      labelNames: ['worker'],
      registers: [this.registry],
    });

    this.workerLoadGauge = new Gauge({
      name: `${METRIC_PREFIX}_worker_load`,
      help: 'Worker load ratio based on max connections per worker.',
      labelNames: ['worker'],
      registers: [this.registry],
    });

    this.reconnectEventsCounter = new Counter({
      name: `${METRIC_PREFIX}_reconnect_events_total`,
      help: 'Total reconnection attempts scheduled.',
      registers: [this.registry],
    });

    const { redisUrl } = getConfig();
    if (redisUrl) {
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      this.queues = createQueueClients(this.redis);
    }
  }

  async getMetrics(): Promise<string> {
    await this.updateQueueMetrics();
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  incrementMessagesReceived(amount = 1) {
    this.messagesReceivedCounter.inc(amount);
  }

  incrementMessagesSent(amount = 1) {
    this.messagesSentCounter.inc(amount);
  }

  incrementAutomationExecutions(amount = 1) {
    this.automationExecutionsCounter.inc(amount);
  }

  incrementEventsProcessed(amount = 1) {
    this.eventsProcessedCounter.inc(amount);
  }

  incrementEventsFailed(amount = 1) {
    this.eventsFailedCounter.inc(amount);
  }

  setConnectionStatusCount(status: string, count: number) {
    this.connectionsGauge.set({ status }, count);
  }

  setConnectionsPerWorker(worker: string, count: number) {
    this.connectionsPerWorkerGauge.set({ worker }, count);
  }

  setWorkerLoad(worker: string, load: number) {
    this.workerLoadGauge.set({ worker }, load);
  }

  incrementReconnectEvents(amount = 1) {
    this.reconnectEventsCounter.inc(amount);
  }

  private async updateQueueMetrics() {
    const redis = this.redis;
    if (!redis || this.queues.length === 0) {
      return;
    }

    await Promise.all(
      this.queues.map(async (queue) => {
        try {
          const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
          const depth =
            (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
          this.queueDepthGauge.set({ queue: queue.name }, depth);

          const metricsKey = `samachat:metrics:queue:${queue.name}`;
          const metrics = await redis.hgetall(metricsKey);
          const completed = Number(metrics.completed || 0);
          const failed = Number(metrics.failed || 0);
          const retries = Number(metrics.retries || 0);

          this.queueCompletedGauge.set({ queue: queue.name }, completed);
          this.queueFailedGauge.set({ queue: queue.name }, failed);
          this.queueRetriesGauge.set({ queue: queue.name }, retries);

          if (queue.name === 'dead-letter') {
            this.queueDlqGauge.set({ queue: queue.name }, depth);
          } else {
            this.queueDlqGauge.set({ queue: queue.name }, 0);
          }
        } catch {
          this.queueDepthGauge.set({ queue: queue.name }, 0);
          this.queueCompletedGauge.set({ queue: queue.name }, 0);
          this.queueFailedGauge.set({ queue: queue.name }, 0);
          this.queueRetriesGauge.set({ queue: queue.name }, 0);
          this.queueDlqGauge.set({ queue: queue.name }, 0);
        }
      }),
    );

  }
}
