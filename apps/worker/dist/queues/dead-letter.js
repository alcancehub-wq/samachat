"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueDeadLetter = enqueueDeadLetter;
const trace_1 = require("../observability/trace");
async function enqueueDeadLetter(queue, job, reason, context) {
    const payload = {
        originalJobId: job.id,
        queue: job.queueName,
        reason,
        failedAt: new Date().toISOString(),
        data: job.data,
        context,
        trace: (0, trace_1.injectTraceContext)(),
    };
    await queue.add('dead-letter', payload, {
        jobId: `${job.queueName}:${job.id}`,
    });
}
