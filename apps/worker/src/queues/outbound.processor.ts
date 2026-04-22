import { Worker, Job } from 'bullmq';
import { context } from '@opentelemetry/api';
import type IORedis from 'ioredis';
import { createJobLoggerContext, getLogger } from '@samachat/logger';
import { getConfig } from '@samachat/config';
import { getProviderByName } from '@samachat/messaging';
import type { MessagingProviderName, SendMessageInput } from '@samachat/messaging';
import type { WorkerQueues } from './index';
import { enqueueDeadLetter } from './dead-letter';
import { acquireQueueLock, releaseQueueLock } from './redis-lock';
import { incrementQueueMetric } from '../observability/queue-metrics';
import { extractTraceContext, getTracer, TraceCarrier } from '../observability/trace';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const PROVIDER_SECRET = process.env.PROVIDER_SECRET || '';

async function sendViaApi(payload: {
  tenantId?: string;
  sessionId?: string;
  messageId?: string;
  jid: string;
  text: string;
  type?: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaSize?: number | null;
}) {
  if (!PROVIDER_SECRET) {
    throw new Error('Missing PROVIDER_SECRET for queued send');
  }

  const response = await fetch(`${API_URL}/messages/send-queued`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-provider-secret': PROVIDER_SECRET,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Queued send failed');
  }

  return (await response.json()) as { externalId?: string };
}

interface OutboundJobData {
  provider: MessagingProviderName;
  input: SendMessageInput;
  requestId?: string;
  eventId?: string;
  correlationId?: string;
  tenantId?: string;
  trace?: TraceCarrier;
  jid?: string;
  text?: string;
  type?: string;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaSize?: number | null;
  sessionId?: string;
  connectionId?: string;
  conversationId?: string;
  messageId?: string;
}

const outboundLogger = getLogger({ service: 'worker', worker: 'outbound-messages' });
const deadLetterLogger = getLogger({ service: 'worker', worker: 'dead-letter' });
const tracer = getTracer();

export function startOutboundProcessor(connection: IORedis, queues: WorkerQueues) {
  const outboundWorker = new Worker(
    'outbound-messages',
    async (job: Job<OutboundJobData>) => {
      const parentContext = extractTraceContext(job.data?.trace);
      return context.with(parentContext, async () => {
        return tracer.startActiveSpan('queue.process outbound-messages', async (span) => {
          const { queueLockTtlMs } = getConfig();
          const lockKey = `samachat:lock:queue:outbound-messages:${job.id}`;
          const lockToken = await acquireQueueLock(connection, lockKey, queueLockTtlMs);
          if (!lockToken) {
            outboundLogger.warn({ jobId: job.id }, 'Outbound job lock already held');
            return { status: 'skipped', reason: 'lock-unavailable' };
          }

          const {
            provider,
            input,
            requestId,
            eventId,
            correlationId,
            tenantId,
            jid,
            text,
            type,
            mediaUrl,
            mediaMime,
            mediaSize,
            sessionId,
            messageId,
            conversationId,
          } = job.data;

          const providerClient = getProviderByName(provider);
          const logContext = createJobLoggerContext({
            jobId: job.id,
            provider,
            eventId,
            requestId,
            correlationId,
            tenantId,
          });

          try {
            span.setAttribute('queue.name', 'outbound-messages');
            span.setAttribute('job.id', String(job.id));
            span.setAttribute('provider', provider);

            outboundLogger.info(
              {
                ...logContext,
                to: input?.to,
              },
              'Processing outbound message',
            );

            const result = await tracer.startActiveSpan('provider.sendMessage', async (providerSpan) => {
              try {
                providerSpan.setAttribute('provider', provider);
                if (jid) {
                  outboundLogger.info(
                    { ...logContext, jid, messageId, conversationId },
                    'WORKER RECEIVED',
                  );
                  const response = await sendViaApi({
                    tenantId,
                    sessionId,
                    jid,
                    text: text ?? '',
                    type,
                    mediaUrl,
                    mediaMime,
                    mediaSize,
                    messageId,
                  });
                  return {
                    messageId: response?.externalId ?? `queued:${Date.now()}`,
                    status: 'sent' as const,
                    provider,
                  };
                }

                return await providerClient.sendMessage(input);
              } finally {
                providerSpan.end();
              }
            });

            outboundLogger.info(
              {
                ...logContext,
                messageId: result.messageId,
                status: result.status,
              },
              'Outbound message sent',
            );
            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            outboundLogger.error({ ...logContext, error: errorMessage }, 'Outbound message failed');
            span.recordException(error as Error);
            throw error;
          } finally {
            await releaseQueueLock(connection, lockKey, lockToken);
            span.end();
          }
        });
      });
    },
    { connection },
  );

  outboundWorker.on('completed', async () => {
    await incrementQueueMetric(connection, 'outbound-messages', 'completed');
  });

  outboundWorker.on('failed', async (job, error) => {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) {
      await incrementQueueMetric(connection, 'outbound-messages', 'retries');
    }
    if (job.attemptsMade >= attempts) {
      await incrementQueueMetric(connection, 'outbound-messages', 'failed');
      await enqueueDeadLetter(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
        provider: job.data?.provider,
        eventId: job.data?.eventId,
        requestId: job.data?.requestId,
        correlationId: job.data?.correlationId,
        tenantId: job.data?.tenantId,
      });
      deadLetterLogger.error(
        createJobLoggerContext({
          jobId: job.id,
          provider: job.data?.provider,
          eventId: job.data?.eventId,
          requestId: job.data?.requestId,
          correlationId: job.data?.correlationId,
          tenantId: job.data?.tenantId,
        }),
        'Outbound message moved to dead-letter',
      );
    }
  });

  return { outboundWorker };
}