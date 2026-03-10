import { Worker, Job } from 'bullmq';
import { context } from '@opentelemetry/api';
import type IORedis from 'ioredis';
import { getLogger } from '@samachat/logger';
import { incrementQueueMetric } from '../observability/queue-metrics';
import { extractTraceContext, getTracer, TraceCarrier } from '../observability/trace';

const logger = getLogger({ service: 'worker', worker: 'campaign-scheduler' });
const tracer = getTracer();

interface CampaignSchedulerJobData {
  trace?: TraceCarrier;
}

export function startCampaignSchedulerProcessor(connection: IORedis) {
  const worker = new Worker(
    'campaign-scheduler',
    async (job: Job<CampaignSchedulerJobData>) => {
      const parentContext = extractTraceContext(job.data?.trace);
      return context.with(parentContext, async () => {
        return tracer.startActiveSpan('queue.process campaign-scheduler', async (span) => {
          try {
            logger.info({ jobId: job.id, data: job.data }, 'Processing campaign schedule');
            span.setAttribute('queue.name', 'campaign-scheduler');
            span.setAttribute('job.id', String(job.id));
            return { status: 'ok' };
          } finally {
            span.end();
          }
        });
      });
    },
    { connection },
  );

  worker.on('completed', async () => {
    await incrementQueueMetric(connection, 'campaign-scheduler', 'completed');
  });

  worker.on('failed', async (job) => {
    if (!job) {
      return;
    }
    await incrementQueueMetric(connection, 'campaign-scheduler', 'failed');
  });

  return worker;
}
