"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webhooks_validator_1 = require("../webhooks.validator");
describe('webhooks.validator', () => {
    it('accepts the base schema for qr', () => {
        const result = (0, webhooks_validator_1.validateWebhookPayload)('qr', { anything: 'ok' });
        expect(result.ok).toBe(true);
    });
    it('rejects waba payloads missing entries', () => {
        const result = (0, webhooks_validator_1.validateWebhookPayload)('waba', { entry: [] });
        expect(result.ok).toBe(false);
        expect(result.error).toBe('invalid-payload');
    });
    it('accepts waba payloads with entries', () => {
        const result = (0, webhooks_validator_1.validateWebhookPayload)('waba', { entry: [{ id: '1' }] });
        expect(result.ok).toBe(true);
    });
});
