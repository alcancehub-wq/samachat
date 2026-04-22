"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWabaWebhookEvent = normalizeWabaWebhookEvent;
exports.verifyWabaSignature = verifyWabaSignature;
const crypto_1 = require("crypto");
function extractWabaValue(payload) {
    if (!payload || typeof payload !== 'object') {
        return undefined;
    }
    const entry = payload.entry;
    if (!Array.isArray(entry) || entry.length === 0) {
        return undefined;
    }
    const firstEntry = entry[0];
    const changes = firstEntry?.changes;
    if (!Array.isArray(changes) || changes.length === 0) {
        return undefined;
    }
    const firstChange = changes[0];
    if (!firstChange?.value || typeof firstChange.value !== 'object') {
        return undefined;
    }
    return firstChange.value;
}
function extractMessageId(value) {
    const messages = value?.messages;
    if (Array.isArray(messages) && messages.length > 0) {
        const message = messages[0];
        if (typeof message.id === 'string') {
            return message.id;
        }
    }
    const statuses = value?.statuses;
    if (Array.isArray(statuses) && statuses.length > 0) {
        const status = statuses[0];
        if (typeof status.id === 'string') {
            return status.id;
        }
    }
    return undefined;
}
function extractContactId(value) {
    const contacts = value?.contacts;
    if (Array.isArray(contacts) && contacts.length > 0) {
        const contact = contacts[0];
        if (typeof contact.wa_id === 'string') {
            return contact.wa_id;
        }
    }
    return undefined;
}
function buildNormalizedPayload(value) {
    const payload = {};
    const messages = value?.messages;
    if (Array.isArray(messages) && messages.length > 0) {
        const message = messages[0];
        if (typeof message.from === 'string') {
            payload.to = message.from;
        }
        const text = message.text?.body;
        if (typeof text === 'string') {
            payload.body = text;
        }
        const media = message.image || message.video || message.audio || message.document;
        if (media && typeof media === 'object' && typeof media.link === 'string') {
            payload.mediaUrl = media.link;
        }
    }
    return payload;
}
function normalizeWabaWebhookEvent(payload, options) {
    const receivedAt = options.receivedAt || new Date().toISOString();
    const value = extractWabaValue(payload);
    const eventId = options.eventIdOverride || extractMessageId(value) || buildFallbackEventId(payload);
    const normalizedPayload = buildNormalizedPayload(value);
    const event = {
        eventId,
        provider: 'waba',
        type: 'webhook',
        payload,
        rawPayload: payload,
        normalizedPayload,
        receivedAt,
        requestId: options.requestId,
        correlationId: options.correlationId,
        tenantId: options.tenantId,
        contactId: extractContactId(value),
    };
    return { ok: true, event };
}
function verifyWabaSignature(input) {
    if (!input.signature) {
        return { valid: false, status: 'missing-signature' };
    }
    if (!input.secret) {
        return { valid: false, status: 'missing-secret' };
    }
    const expected = `sha256=${(0, crypto_1.createHmac)('sha256', input.secret).update(input.rawBody).digest('hex')}`;
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
