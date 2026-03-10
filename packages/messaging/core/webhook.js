"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWebhookEvent = normalizeWebhookEvent;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.buildFallbackEventId = buildFallbackEventId;
const crypto_1 = require("crypto");
const webhook_1 = require("../providers/qr/webhook");
const webhook_2 = require("../providers/waba/webhook");
function normalizeWebhookEvent(provider, payload, options = {}) {
    if (provider === 'waba') {
        return (0, webhook_2.normalizeWabaWebhookEvent)(payload, options);
    }
    if (provider === 'qr') {
        return (0, webhook_1.normalizeQrWebhookEvent)(payload, options);
    }
    return { ok: false, error: 'unsupported-provider' };
}
function verifyWebhookSignature(input) {
    if (input.provider === 'waba') {
        return (0, webhook_2.verifyWabaSignature)(input);
    }
    if (input.provider === 'qr') {
        return (0, webhook_1.verifyQrSignature)(input);
    }
    return { valid: false, status: 'unsupported' };
}
function buildFallbackEventId(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    return (0, crypto_1.createHash)('sha256').update(serialized).digest('hex');
}
