"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementQueueMetric = incrementQueueMetric;
exports.setQueueDepthMetric = setQueueDepthMetric;
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ service: 'worker', component: 'queue-metrics' });
async function incrementQueueMetric(connection, queueName, metric, amount = 1) {
    try {
        const key = `samachat:metrics:queue:${queueName}`;
        await connection.hincrby(key, metric, amount);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn({ error: message, queue: queueName, metric }, 'Failed to update queue metrics');
    }
}
async function setQueueDepthMetric(connection, queueName, depth) {
    try {
        const key = `samachat:metrics:queue:${queueName}`;
        await connection.hset(key, 'depth', depth);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn({ error: message, queue: queueName }, 'Failed to update queue depth');
    }
}
