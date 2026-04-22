"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInboundProcessor = startInboundProcessor;
const bullmq_1 = require("bullmq");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("@samachat/logger");
const config_1 = require("@samachat/config");
const messaging_1 = require("@samachat/messaging");
const dead_letter_1 = require("./dead-letter");
const backpressure_1 = require("./backpressure");
const redis_lock_1 = require("./redis-lock");
const queue_metrics_1 = require("../observability/queue-metrics");
const trace_1 = require("../observability/trace");
const logger = (0, logger_1.getLogger)({ service: 'worker', worker: 'inbound-events' });
const tracer = (0, trace_1.getTracer)();
function startInboundProcessor(connection, queues) {
    const worker = new bullmq_1.Worker('inbound-events', async (job) => {
        const parentContext = (0, trace_1.extractTraceContext)(job.data?.trace);
        return api_1.context.with(parentContext, async () => {
            return tracer.startActiveSpan('queue.process inbound-events', async (span) => {
                const { queueLockTtlMs } = (0, config_1.getConfig)();
                const lockKey = `samachat:lock:queue:inbound-events:${job.id}`;
                const lockToken = await (0, redis_lock_1.acquireQueueLock)(connection, lockKey, queueLockTtlMs);
                if (!lockToken) {
                    logger.warn({ jobId: job.id }, 'Inbound job lock already held');
                    return { status: 'skipped', reason: 'lock-unavailable' };
                }
                try {
                    const { event, requestId, correlationId } = job.data;
                    const providerName = (0, messaging_1.resolveProviderName)(event);
                    const logContext = (0, logger_1.createJobLoggerContext)({
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
                    const input = {
                        to,
                        body,
                        metadata: { eventId: event.eventId, correlationId },
                    };
                    await tracer.startActiveSpan('queue.enqueue outbound-messages', async (enqueueSpan) => {
                        try {
                            const trace = (0, trace_1.injectTraceContext)();
                            await (0, backpressure_1.applyQueueBackpressure)(connection, queues.outboundMessagesQueue, 'outbound-messages');
                            await queues.outboundMessagesQueue.add('outbound-message', {
                                provider: providerName,
                                input,
                                eventId: event.eventId,
                                requestId,
                                correlationId,
                                tenantId: event.tenantId,
                                trace,
                            }, { jobId: `${event.eventId}:${providerName}` });
                            enqueueSpan.setAttribute('queue.name', 'outbound-messages');
                        }
                        finally {
                            enqueueSpan.end();
                        }
                    });
                    const mediaUrl = typeof payload.mediaUrl === 'string' ? payload.mediaUrl : undefined;
                    if (mediaUrl) {
                        await tracer.startActiveSpan('queue.enqueue media-download', async (enqueueSpan) => {
                            try {
                                const trace = (0, trace_1.injectTraceContext)();
                                await (0, backpressure_1.applyQueueBackpressure)(connection, queues.mediaDownloadQueue, 'media-download');
                                await queues.mediaDownloadQueue.add('media-download', {
                                    mediaUrl,
                                    provider: providerName,
                                    eventId: event.eventId,
                                    requestId,
                                    correlationId,
                                    tenantId: event.tenantId,
                                    trace,
                                }, { jobId: `${event.eventId}:${providerName}:media` });
                                enqueueSpan.setAttribute('queue.name', 'media-download');
                            }
                            finally {
                                enqueueSpan.end();
                            }
                        });
                        logger.info(logContext, 'Media download job queued');
                    }
                    logger.info(logContext, 'Inbound event queued for outbound processing');
                    return { status: 'queued', provider: providerName };
                }
                finally {
                    await (0, redis_lock_1.releaseQueueLock)(connection, lockKey, lockToken);
                    span.end();
                }
            });
        });
    }, { connection });
    worker.on('completed', async () => {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'inbound-events', 'completed');
    });
    worker.on('failed', async (job, error) => {
        if (!job) {
            return;
        }
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'inbound-events', 'retries');
        }
        if (job.attemptsMade >= attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'inbound-events', 'failed');
            const event = job.data?.event;
            await (0, dead_letter_1.enqueueDeadLetter)(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
                provider: event?.provider,
                eventId: event?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: event?.tenantId,
            });
            logger.error((0, logger_1.createJobLoggerContext)({
                jobId: job.id,
                provider: event?.provider,
                eventId: event?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: event?.tenantId,
            }), 'Inbound job moved to dead-letter');
        }
    });
    return worker;
}
