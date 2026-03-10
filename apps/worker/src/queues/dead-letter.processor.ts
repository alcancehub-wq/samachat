import { Worker, Job } from 'bullmq';
import { context } from '@opentelemetry/api';
import type IORedis from 'ioredis';
import { createJobLoggerContext, getLogger } from '@samachat/logger';
import type { DeadLetterPayload } from './dead-letter';
import { incrementQueueMetric } from '../observability/queue-metrics';
import { extractTraceContext, getTracer } from '../observability/trace';

const logger = getLogger({ service: 'worker', worker: 'dead-letter' });
const tracer = getTracer();

export function startDeadLetterProcessor(connection: IORedis) {
  const worker = new Worker(
    'dead-letter',
    async (job: Job<DeadLetterPayload>) => {
      const parentContext = extractTraceContext(job.data?.trace);
      return context.with(parentContext, async () => {
        return tracer.startActiveSpan('queue.process dead-letter', async (span) => {
          try {
            logger.error(
              createJobLoggerContext({
                jobId: job.id,
                queue: job.data.queue,
              }),
              'Dead-letter job received',
            );
            span.setAttribute('queue.name', 'dead-letter');
            span.setAttribute('job.id', String(job.id));
          } finally {
            span.end();
          }
        });
      });
    },
    { connection },
  );

  worker.on('completed', async () => {
    await incrementQueueMetric(connection, 'dead-letter', 'completed');
  });

  worker.on('failed', async (job) => {
    if (!job) {
      return;
    }
    await incrementQueueMetric(connection, 'dead-letter', 'failed');
  });

  return worker;
}
