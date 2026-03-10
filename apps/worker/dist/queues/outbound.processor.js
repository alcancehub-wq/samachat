"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOutboundProcessor = startOutboundProcessor;
const bullmq_1 = require("bullmq");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("@samachat/logger");
const config_1 = require("@samachat/config");
const messaging_1 = require("@samachat/messaging");
const dead_letter_1 = require("./dead-letter");
const redis_lock_1 = require("./redis-lock");
const queue_metrics_1 = require("../observability/queue-metrics");
const trace_1 = require("../observability/trace");
const outboundLogger = (0, logger_1.getLogger)({ service: 'worker', worker: 'outbound-messages' });
const deadLetterLogger = (0, logger_1.getLogger)({ service: 'worker', worker: 'dead-letter' });
const tracer = (0, trace_1.getTracer)();
function startOutboundProcessor(connection, queues) {
    const outboundWorker = new bullmq_1.Worker('outbound-messages', async (job) => {
        const parentContext = (0, trace_1.extractTraceContext)(job.data?.trace);
        return api_1.context.with(parentContext, async () => {
            return tracer.startActiveSpan('queue.process outbound-messages', async (span) => {
                const { queueLockTtlMs } = (0, config_1.getConfig)();
                const lockKey = `samachat:lock:queue:outbound-messages:${job.id}`;
                const lockToken = await (0, redis_lock_1.acquireQueueLock)(connection, lockKey, queueLockTtlMs);
                if (!lockToken) {
                    outboundLogger.warn({ jobId: job.id }, 'Outbound job lock already held');
                    return { status: 'skipped', reason: 'lock-unavailable' };
                }
                const { provider, input, requestId, eventId, correlationId, tenantId } = job.data;
                const providerClient = (0, messaging_1.getProviderByName)(provider);
                const logContext = (0, logger_1.createJobLoggerContext)({
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
                    outboundLogger.info(logContext, 'Processing outbound message');
                    const result = await tracer.startActiveSpan('provider.sendMessage', async (providerSpan) => {
                        try {
                            providerSpan.setAttribute('provider', provider);
                            return await providerClient.sendMessage(input);
                        }
                        finally {
                            providerSpan.end();
                        }
                    });
                    outboundLogger.info({
                        ...logContext,
                        messageId: result.messageId,
                        status: result.status,
                    }, 'Outbound message sent');
                    return result;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    outboundLogger.error({ ...logContext, error: errorMessage }, 'Outbound message failed');
                    span.recordException(error);
                    throw error;
                }
                finally {
                    await (0, redis_lock_1.releaseQueueLock)(connection, lockKey, lockToken);
                    span.end();
                }
            });
        });
    }, { connection });
    outboundWorker.on('completed', async () => {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'outbound-messages', 'completed');
    });
    outboundWorker.on('failed', async (job, error) => {
        if (!job) {
            return;
        }
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'outbound-messages', 'retries');
        }
        if (job.attemptsMade >= attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'outbound-messages', 'failed');
            await (0, dead_letter_1.enqueueDeadLetter)(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
                provider: job.data?.provider,
                eventId: job.data?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: job.data?.tenantId,
            });
            deadLetterLogger.error((0, logger_1.createJobLoggerContext)({
                jobId: job.id,
                provider: job.data?.provider,
                eventId: job.data?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: job.data?.tenantId,
            }), 'Outbound message moved to dead-letter');
        }
    });
    return { outboundWorker };
}
