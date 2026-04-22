"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIdempotencyKey = buildIdempotencyKey;
exports.buildReplayProtectionKey = buildReplayProtectionKey;
exports.computeReplayFingerprint = computeReplayFingerprint;
exports.checkAndSetIdempotency = checkAndSetIdempotency;
exports.checkAndSetReplayProtection = checkAndSetReplayProtection;
const crypto_1 = require("crypto");
function buildIdempotencyKey(event) {
    return `webhook:${event.provider}:${event.eventId}`;
}
function buildReplayProtectionKey(provider, fingerprint) {
    return `webhook-replay:${provider}:${fingerprint}`;
}
function computeReplayFingerprint(provider, rawBody, timestampMs, signature) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(provider);
    hash.update('|');
    hash.update(String(timestampMs));
    hash.update('|');
    hash.update(signature || '');
    hash.update('|');
    hash.update(rawBody);
    return hash.digest('hex');
}
async function checkAndSetIdempotency(redis, event, requestId, ttlSeconds) {
    const key = buildIdempotencyKey(event);
    const result = await redis.set(key, requestId, 'EX', ttlSeconds, 'NX');
    return Boolean(result);
}
async function checkAndSetReplayProtection(redis, provider, rawBody, timestampMs, signature, ttlSeconds) {
    const fingerprint = computeReplayFingerprint(provider, rawBody, timestampMs, signature);
    const key = buildReplayProtectionKey(provider, fingerprint);
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return Boolean(result);
}
