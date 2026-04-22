"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCampaignSchedulerProcessor = startCampaignSchedulerProcessor;
const bullmq_1 = require("bullmq");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("@samachat/logger");
const queue_metrics_1 = require("../observability/queue-metrics");
const trace_1 = require("../observability/trace");
const logger = (0, logger_1.getLogger)({ service: 'worker', worker: 'campaign-scheduler' });
const tracer = (0, trace_1.getTracer)();
function startCampaignSchedulerProcessor(connection) {
    const worker = new bullmq_1.Worker('campaign-scheduler', async (job) => {
        const parentContext = (0, trace_1.extractTraceContext)(job.data?.trace);
        return api_1.context.with(parentContext, async () => {
            return tracer.startActiveSpan('queue.process campaign-scheduler', async (span) => {
                try {
                    logger.info({ jobId: job.id, data: job.data }, 'Processing campaign schedule');
                    span.setAttribute('queue.name', 'campaign-scheduler');
                    span.setAttribute('job.id', String(job.id));
                    return { status: 'ok' };
                }
                finally {
                    span.end();
                }
            });
        });
    }, { connection });
    worker.on('completed', async () => {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'campaign-scheduler', 'completed');
    });
    worker.on('failed', async (job) => {
        if (!job) {
            return;
        }
        await (0, queue_metrics_1.incrementQueueMetric)(connection, 'campaign-scheduler', 'failed');
    });
    return worker;
}
