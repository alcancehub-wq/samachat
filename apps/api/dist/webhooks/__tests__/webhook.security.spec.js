"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webhook_security_1 = require("../webhook.security");
const now = new Date('2024-01-01T00:00:00.000Z').getTime();
describe('webhook.security', () => {
    it('returns the first available timestamp header', () => {
        const headers = {
            'x-request-timestamp': '123',
            'x-webhook-timestamp': '456',
        };
        expect((0, webhook_security_1.getWebhookTimestampHeader)(headers)).toBe('456');
    });
    it('handles array header values', () => {
        const headers = {
            'x-webhook-timestamp': ['789', '123'],
        };
        expect((0, webhook_security_1.getWebhookTimestampHeader)(headers)).toBe('789');
    });
    it('rejects missing timestamps', () => {
        expect(() => (0, webhook_security_1.assertFreshWebhookTimestamp)(undefined, now)).toThrow('Missing webhook timestamp');
    });
    it('rejects invalid timestamps', () => {
        expect(() => (0, webhook_security_1.assertFreshWebhookTimestamp)('invalid', now)).toThrow('Invalid webhook timestamp');
    });
    it('rejects stale timestamps', () => {
        const stale = now - 10 * 60 * 1000;
        expect(() => (0, webhook_security_1.assertFreshWebhookTimestamp)(String(stale), now)).toThrow('Stale webhook');
    });
    it('accepts numeric seconds timestamps', () => {
        const seconds = Math.floor(now / 1000);
        expect((0, webhook_security_1.assertFreshWebhookTimestamp)(String(seconds), now)).toBe(seconds * 1000);
    });
    it('accepts ISO timestamps', () => {
        const iso = new Date(now).toISOString();
        expect((0, webhook_security_1.assertFreshWebhookTimestamp)(iso, now)).toBe(now);
    });
});
