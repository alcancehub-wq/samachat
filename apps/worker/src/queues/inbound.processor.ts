import { Worker, Job } from 'bullmq';
import { context } from '@opentelemetry/api';
import type IORedis from 'ioredis';
import { createJobLoggerContext, getLogger } from '@samachat/logger';
import { resolveProviderName } from '@samachat/messaging';
import type { NormalizedWebhookEvent, SendMessageInput } from '@samachat/messaging';
import type { WorkerQueues } from './index';
import { enqueueDeadLetter } from './dead-letter';
import { incrementQueueMetric } from '../observability/queue-metrics';
import { extractTraceContext, getTracer, injectTraceContext, TraceCarrier } from '../observability/trace';

interface InboundJobData {
  event: NormalizedWebhookEvent;
  requestId: string;
  correlationId: string;
  trace?: TraceCarrier;
}

const logger = getLogger({ service: 'worker', worker: 'inbound-events' });
const tracer = getTracer();

export function startInboundProcessor(connection: IORedis, queues: WorkerQueues) {
  const worker = new Worker(
    'inbound-events',
    async (job: Job<InboundJobData>) => {
      const parentContext = extractTraceContext(job.data?.trace);
      return context.with(parentContext, async () => {
        return tracer.startActiveSpan('queue.process inbound-events', async (span) => {
          try {
            const { event, requestId, correlationId } = job.data;
            const providerName = resolveProviderName(event);
            const logContext = createJobLoggerContext({
              jobId: job.id,
              provider: providerName,
              eventId: event.eventId,
              requestId,
              correlationId,
              tenantId: event.tenantId,
            });

            span.setAttribute('queue.name', 'inbound-events');
            span.setAttribute('job.id', String(job.id));

            const payload = event.normalizedPayload || {};
            const to = typeof payload.to === 'string' ? payload.to : event.contactId || 'stub';
            const body = typeof payload.body === 'string' ? payload.body : 'Inbound event received';

            const input: SendMessageInput = {
              to,
              body,
              metadata: { eventId: event.eventId, correlationId },
            };

            await tracer.startActiveSpan('queue.enqueue outbound-messages', async (enqueueSpan) => {
              try {
                const trace = injectTraceContext();
                await queues.outboundMessagesQueue.add(
                  'outbound-message',
                  {
                    provider: providerName,
                    input,
                    eventId: event.eventId,
                    requestId,
                    correlationId,
                    tenantId: event.tenantId,
                    trace,
                  },
                  { jobId: `${event.eventId}:${providerName}` },
                );
                enqueueSpan.setAttribute('queue.name', 'outbound-messages');
              } finally {
                enqueueSpan.end();
              }
            });

            const mediaUrl = typeof payload.mediaUrl === 'string' ? payload.mediaUrl : undefined;
            if (mediaUrl) {
              await tracer.startActiveSpan('queue.enqueue media-download', async (enqueueSpan) => {
                try {
                  const trace = injectTraceContext();
                  await queues.mediaDownloadQueue.add(
                    'media-download',
                    {
                      mediaUrl,
                      provider: providerName,
                      eventId: event.eventId,
                      requestId,
                      correlationId,
                      tenantId: event.tenantId,
                      trace,
                    },
                    { jobId: `${event.eventId}:${providerName}:media` },
                  );
                  enqueueSpan.setAttribute('queue.name', 'media-download');
                } finally {
                  enqueueSpan.end();
                }
              });
              logger.info(logContext, 'Media download job queued');
            }

            logger.info(logContext, 'Inbound event queued for outbound processing');
            return { status: 'queued', provider: providerName };
          } finally {
            span.end();
          }
        });
      });
    },
    { connection },
  );

  worker.on('completed', async () => {
    await incrementQueueMetric(connection, 'inbound-events', 'completed');
  });

  worker.on('failed', async (job, error) => {
    if (!job) {
      return;
    }
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) {
      await incrementQueueMetric(connection, 'inbound-events', 'retries');
    }
    if (job.attemptsMade >= attempts) {
      await incrementQueueMetric(connection, 'inbound-events', 'failed');
      const event = job.data?.event as NormalizedWebhookEvent | undefined;
      await enqueueDeadLetter(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
        provider: event?.provider,
        eventId: event?.eventId,
        requestId: job.data?.requestId,
        correlationId: job.data?.correlationId,
        tenantId: event?.tenantId,
      });
      logger.error(
        createJobLoggerContext({
          jobId: job.id,
          provider: event?.provider,
          eventId: event?.eventId,
          requestId: job.data?.requestId,
          correlationId: job.data?.correlationId,
          tenantId: event?.tenantId,
        }),
        'Inbound job moved to dead-letter',
      );
    }
  });

  return worker;
}