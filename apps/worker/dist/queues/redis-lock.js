"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acquireQueueLock = acquireQueueLock;
exports.releaseQueueLock = releaseQueueLock;
const crypto_1 = require("crypto");
async function acquireQueueLock(connection, key, ttlMs) {
    const token = (0, crypto_1.randomUUID)();
    const result = await connection.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK' ? token : null;
}
async function releaseQueueLock(connection, key, token) {
    const script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    await connection.eval(script, 1, key, token);
}
