"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wabaWebhookSchema = exports.webhookBaseSchema = void 0;
exports.validateWebhookPayload = validateWebhookPayload;
const zod_1 = require("zod");
exports.webhookBaseSchema = zod_1.z.object({}).passthrough();
exports.wabaWebhookSchema = zod_1.z
    .object({
    entry: zod_1.z.array(zod_1.z.unknown()).min(1),
})
    .passthrough();
function getWebhookSchema(provider) {
    return provider === 'waba' ? exports.wabaWebhookSchema : exports.webhookBaseSchema;
}
function validateWebhookPayload(provider, payload) {
    const schema = getWebhookSchema(provider);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return { ok: false, error: 'invalid-payload' };
    }
    return { ok: true };
}
