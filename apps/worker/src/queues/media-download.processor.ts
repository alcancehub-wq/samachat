import { Worker, Job } from 'bullmq';
import { context } from '@opentelemetry/api';
import type IORedis from 'ioredis';
import { createJobLoggerContext, getLogger } from '@samachat/logger';
import { getConfig } from '@samachat/config';
import { createStorageProvider } from '@samachat/storage';
import type { StorageMetadata } from '@samachat/storage';
import type { WorkerQueues } from './index';
import { enqueueDeadLetter } from './dead-letter';
import { acquireQueueLock, releaseQueueLock } from './redis-lock';
import { persistStorageMetadata } from '../storage/storage-metadata';
import { incrementQueueMetric } from '../observability/queue-metrics';
import { extractTraceContext, getTracer, TraceCarrier } from '../observability/trace';

interface MediaDownloadJobData {
  mediaUrl: string;
  provider?: string;
  eventId?: string;
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  trace?: TraceCarrier;
}

const logger = getLogger({ service: 'worker', worker: 'media-download' });
const storage = createStorageProvider();
const tracer = getTracer();

export function startMediaDownloadProcessor(connection: IORedis, queues: WorkerQueues) {
  const worker = new Worker(
    'media-download',
    async (job: Job<MediaDownloadJobData>) => {
      const parentContext = extractTraceContext(job.data?.trace);
      return context.with(parentContext, async () => {
        return tracer.startActiveSpan('queue.process media-download', async (span) => {
          const { queueLockTtlMs } = getConfig();
          const lockKey = `samachat:lock:queue:media-download:${job.id}`;
          const lockToken = await acquireQueueLock(connection, lockKey, queueLockTtlMs);
          if (!lockToken) {
            logger.warn({ jobId: job.id }, 'Media download lock already held');
            return { status: 'skipped', reason: 'lock-unavailable' };
          }

          try {
            const { mediaUrl, provider, eventId, requestId, correlationId, tenantId } = job.data;
            const logContext = createJobLoggerContext({
              jobId: job.id,
              provider,
              eventId,
              requestId,
              correlationId,
              tenantId,
            });

            span.setAttribute('queue.name', 'media-download');
            span.setAttribute('job.id', String(job.id));

            logger.info(logContext, 'Downloading media');

            const response = await fetch(mediaUrl);
            if (!response.ok) {
              throw new Error(`Media download failed with status ${response.status}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const contentType = response.headers.get('content-type') || undefined;
            const filename = deriveFilename(mediaUrl);
            const metadata: StorageMetadata = {
              filename,
              contentType,
              extension: filename ? filename.split('.').pop() : undefined,
              sizeBytes: buffer.length,
            };

            const result = await storage.saveFile(buffer, metadata);
            await persistStorageMetadata(result, metadata);

            logger.info(
              {
                ...logContext,
                storageKey: result.storageKey,
                provider: result.provider,
              },
              'Media stored',
            );

            return { storageKey: result.storageKey, url: result.url };
          } finally {
            await releaseQueueLock(connection, lockKey, lockToken);
            span.end();
          }
        });
      });
    },
    { connection },
  );

  worker.on('completed', async () => {
    await incrementQueueMetric(connection, 'media-download', 'completed');
  });

  worker.on('failed', async (job, error) => {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) {
      await incrementQueueMetric(connection, 'media-download', 'retries');
    }
    if (job.attemptsMade >= attempts) {
      await incrementQueueMetric(connection, 'media-download', 'failed');
      await enqueueDeadLetter(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
        provider: job.data?.provider,
        eventId: job.data?.eventId,
        requestId: job.data?.requestId,
        correlationId: job.data?.correlationId,
        tenantId: job.data?.tenantId,
      });
      logger.error(
        createJobLoggerContext({
          jobId: job.id,
          provider: job.data?.provider,
          eventId: job.data?.eventId,
          requestId: job.data?.requestId,
          correlationId: job.data?.correlationId,
          tenantId: job.data?.tenantId,
        }),
        'Media download moved to dead-letter',
      );
    }
  });

  return worker;
}

function deriveFilename(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lastSegment = pathname.split('/').pop();
    return lastSegment || undefined;
  } catch {
    return undefined;
  }
}
