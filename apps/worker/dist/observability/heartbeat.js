"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWorkerHeartbeat = startWorkerHeartbeat;
const os_1 = require("os");
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ service: 'worker', component: 'heartbeat' });
function startWorkerHeartbeat(connection) {
    const workerId = process.env.WORKER_ID || `worker-${(0, os_1.hostname)()}-${process.pid}-${Math.random().toString(16).slice(2)}`;
    const key = `samachat:worker:heartbeat:${workerId}`;
    const ttlSeconds = Number(process.env.WORKER_HEARTBEAT_TTL_SECONDS || 30);
    const intervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 10000);
    const safeTtl = Number.isFinite(ttlSeconds) ? ttlSeconds : 30;
    const safeInterval = Number.isFinite(intervalMs) ? intervalMs : 10000;
    const sendHeartbeat = async () => {
        const payload = {
            workerId,
            service: 'worker',
            timestamp: new Date().toISOString(),
        };
        await connection.set(key, JSON.stringify(payload), 'EX', safeTtl);
    };
    sendHeartbeat().catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn({ error: message }, 'Worker heartbeat failed');
    });
    const interval = setInterval(() => {
        sendHeartbeat().catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.warn({ error: message }, 'Worker heartbeat failed');
        });
    }, safeInterval);
    if (typeof interval.unref === 'function') {
        interval.unref();
    }
    return interval;
}
