"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMediaDownloadProcessor = startMediaDownloadProcessor;
const bullmq_1 = require("bullmq");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("@samachat/logger");
const config_1 = require("@samachat/config");
const storage_1 = require("@samachat/storage");
const dead_letter_1 = require("./dead-letter");
const redis_lock_1 = require("./redis-lock");
const storage_metadata_1 = require("../storage/storage-metadata");
const queue_metrics_1 = require("../observability/queue-metrics");
const trace_1 = require("../observability/trace");
const logger = (0, logger_1.getLogger)({ service: 'worker', worker: 'media-download' });
const storage = (0, storage_1.createStorageProvider)();
const tracer = (0, trace_1.getTracer)();
function startMediaDownloadProcessor(connection, queues) {
    const worker = new bullmq_1.Worker('media-download', async (job) => {
        const parentContext = (0, trace_1.extractTraceContext)(job.data?.trace);
        return api_1.context.with(parentContext, async () => {
            return tracer.startActiveSpan('queue.process media-download', async (span) => {
                const { queueLockTtlMs } = (0, config_1.getConfig)();
                const lockKey = `samachat:lock:queue:media-download:${job.id}`;
                const lockToken = await (0, redis_lock_1.acquireQueueLock)(connection, lockKey, queueLockTtlMs);
                if (!lockToken) {
                    logger.warn({ jobId: job.id }, 'Media download lock already held');
                    return { status: 'skipped', reason: 'lock-unavailable' };
                }
                try {
                    const { mediaUrl, provider, eventId, requestId, correlationId, tenantId } = job.data;
                    const logContext = (0, logger_1.createJobLoggerContext)({
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
                    const metadata = {
                        filename,
                        contentType,
                        extension: filename ? filename.split('.').pop() : undefined,
                        sizeBytes: buffer.length,
                    };
                    const result = await storage.saveFile(buffer, metadata);
                    await (0, storage_metadata_1.persistStorageMetadata)(result, metadata);
                    logger.info({
                        ...logContext,
                        storageKey: result.storageKey,
                        provider: result.provider,
                    }, 'Media stored');
                    return { storageKey: result.storageKey, url: result.url };
                }
                finally {
                    await (0, redis_lock_1.releaseQueueLock)(connection, lockKey, lockToken);
                    span.end();
                }
            });
        });
    }, { connection });
    worker.on('completed', async () => {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'media-download', 'completed');
    });
    worker.on('failed', async (job, error) => {
        if (!job) {
            return;
        }
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade < attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'media-download', 'retries');
        }
        if (job.attemptsMade >= attempts) {
            await (0, queue_metrics_1.incrementQueueMetric)(connection, 'media-download', 'failed');
            await (0, dead_letter_1.enqueueDeadLetter)(queues.deadLetterQueue, job, error?.message || 'Unknown error', {
                provider: job.data?.provider,
                eventId: job.data?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: job.data?.tenantId,
            });
            logger.error((0, logger_1.createJobLoggerContext)({
                jobId: job.id,
                provider: job.data?.provider,
                eventId: job.data?.eventId,
                requestId: job.data?.requestId,
                correlationId: job.data?.correlationId,
                tenantId: job.data?.tenantId,
            }), 'Media download moved to dead-letter');
        }
    });
    return worker;
}
function deriveFilename(url) {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname;
        const lastSegment = pathname.split('/').pop();
        return lastSegment || undefined;
    }
    catch {
        return undefined;
    }
}
