"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeQrWebhookEvent = normalizeQrWebhookEvent;
exports.verifyQrSignature = verifyQrSignature;
const crypto_1 = require("crypto");
function extractQrEventId(payload) {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }
    const value = payload.eventId;
    if (typeof value === 'string' && value.trim().length > 0) {
        return value;
    }
    return undefined;
}
function buildNormalizedPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return {};
    }
    const record = payload;
    const normalized = {};
    if (typeof record.to === 'string') {
        normalized.to = record.to;
    }
    if (typeof record.body === 'string') {
        normalized.body = record.body;
    }
    if (typeof record.mediaUrl === 'string') {
        normalized.mediaUrl = record.mediaUrl;
    }
    return normalized;
}
function normalizeQrWebhookEvent(payload, options) {
    const receivedAt = options.receivedAt || new Date().toISOString();
    const eventId = options.eventIdOverride || extractQrEventId(payload) || buildFallbackEventId(payload);
    const event = {
        eventId,
        provider: 'qr',
        type: 'webhook',
        payload,
        rawPayload: payload,
        normalizedPayload: buildNormalizedPayload(payload),
        receivedAt,
        requestId: options.requestId,
        correlationId: options.correlationId,
        tenantId: options.tenantId,
    };
    return { ok: true, event };
}
function verifyQrSignature(input) {
    if (!input.signature) {
        return { valid: false, status: 'missing-signature' };
    }
    if (!input.secret) {
        return { valid: false, status: 'missing-secret' };
    }
    const expected = (0, crypto_1.createHmac)('sha256', input.secret).update(input.rawBody).digest('hex');
    const valid = timingSafeCompare(expected, input.signature);
    return { valid, status: valid ? 'ok' : 'invalid-signature' };
}
function buildFallbackEventId(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    return (0, crypto_1.createHash)('sha256').update(serialized).digest('hex');
}
function timingSafeCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
