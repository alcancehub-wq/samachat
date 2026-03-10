"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookTimestampHeader = getWebhookTimestampHeader;
exports.assertFreshWebhookTimestamp = assertFreshWebhookTimestamp;
const common_1 = require("@nestjs/common");
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
const TIMESTAMP_HEADERS = [
    'x-webhook-timestamp',
    'x-timestamp',
    'x-request-timestamp',
    'x-hub-timestamp',
];
function getHeaderValue(headers, key) {
    const value = headers[key];
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
}
function parseWebhookTimestamp(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    if (/^\d+$/.test(trimmed)) {
        const numeric = Number(trimmed);
        if (!Number.isFinite(numeric)) {
            return null;
        }
        return trimmed.length === 10 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return parsed;
}
function getWebhookTimestampHeader(headers) {
    for (const header of TIMESTAMP_HEADERS) {
        const value = getHeaderValue(headers, header);
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
    }
    return undefined;
}
function assertFreshWebhookTimestamp(headerValue, nowMs = Date.now()) {
    if (!headerValue) {
        throw new common_1.UnauthorizedException('Missing webhook timestamp');
    }
    const parsed = parseWebhookTimestamp(headerValue);
    if (parsed === null) {
        throw new common_1.UnauthorizedException('Invalid webhook timestamp');
    }
    if (Math.abs(nowMs - parsed) > MAX_WEBHOOK_AGE_MS) {
        throw new common_1.UnauthorizedException('Stale webhook');
    }
    return parsed;
}
