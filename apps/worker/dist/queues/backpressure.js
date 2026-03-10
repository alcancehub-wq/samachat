"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyQueueBackpressure = applyQueueBackpressure;
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const queue_metrics_1 = require("../observability/queue-metrics");
const logger = (0, logger_1.getLogger)({ service: 'worker', component: 'backpressure' });
async function applyQueueBackpressure(connection, queue, queueName) {
    const { queueBackpressure } = (0, config_1.getConfig)();
    const waiting = await queue.getWaitingCount();
    const delayed = await queue.getDelayedCount();
    const depth = waiting + delayed;
    await (0, queue_metrics_1.setQueueDepthMetric)(connection, queueName, depth);
    if (depth < queueBackpressure.threshold) {
        return depth;
    }
    const cooldownKey = `samachat:metrics:queue:${queueName}:backpressure-cooldown`;
    const cooldownMs = queueBackpressure.warningCooldownMs;
    const cooldownSet = await connection.set(cooldownKey, String(Date.now()), 'PX', cooldownMs, 'NX');
    if (cooldownSet) {
        await (0, queue_metrics_1.incrementQueueMetric)(connection, queueName, 'backpressure');
        logger.warn({ queue: queueName, depth }, 'Queue backpressure applied');
    }
    await new Promise((resolve) => setTimeout(resolve, queueBackpressure.delayMs));
    return depth;
}
