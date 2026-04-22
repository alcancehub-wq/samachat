"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDeadLetterProcessor = startDeadLetterProcessor;
const bullmq_1 = require("bullmq");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("@samachat/logger");
const queue_metrics_1 = require("../observability/queue-metrics");
const trace_1 = require("../observability/trace");
const logger = (0, logger_1.getLogger)({ service: 'worker', worker: 'dead-letter' });
const tracer = (0, trace_1.getTracer)();
function startDeadLetterProcessor(connection) {
    const worker = new bullmq_1.Worker('dead-letter', async (job) => {
        const parentContext = (0, trace_1.extractTraceContext)(job.data?.trace);
        return api_1.context.with(parentContext, async () => {
            return tracer.startActiveSpan('queue.process dead-letter', async (span) => {
                try {
                    logger.error((0, logger_1.createJobLoggerContext)({
                        jobId: job.id,
                        queue: job.data.queue,
                    }), 'Dead-letter job received');
                    span.setAttribute('queue.name', 'dead-letter');
                    span.setAttribute('job.id', String(job.id));
                }
                finally {
                    span.end();
                }
            });
        });
    }, { connection });
    worker.on('completed', async () => {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'dead-letter', 'completed');
    });
    worker.on('failed', async (job) => {
        if (!job) {
            return;
        }
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'dead-letter', 'failed');
    });
    return worker;
}
