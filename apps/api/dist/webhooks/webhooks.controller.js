"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const messaging_1 = require("@samachat/messaging");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const webhooks_service_1 = require("./webhooks.service");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const webhook_security_1 = require("./webhook.security");
const webhooks_validator_1 = require("./webhooks.validator");
const logger = (0, logger_1.getLogger)({ service: 'api', component: 'webhooks' });
const validProviders = ['qr', 'waba'];
function isProviderName(value) {
    return validProviders.includes(value);
}
let WebhooksController = class WebhooksController {
    webhooksService;
    constructor(webhooksService) {
        this.webhooksService = webhooksService;
    }
    async handleWebhook(provider, payload, req, headers, requestIdHeader, correlationIdHeader, eventIdHeader, contentTypeHeader, wabaSignature, webhookSignature, qrSignature) {
        if (!isProviderName(provider)) {
            throw new common_1.BadRequestException('Invalid provider');
        }
        const config = (0, config_1.getConfig)();
        const contentType = ((contentTypeHeader || '').split(';')[0] || '').trim();
        if (!contentType || !config.webhook.allowedContentTypes.includes(contentType)) {
            throw new common_1.BadRequestException('Unsupported content-type');
        }
        if (payload === null || payload === undefined) {
            throw new common_1.BadRequestException('Missing payload');
        }
        const timestampHeader = (0, webhook_security_1.getWebhookTimestampHeader)(headers);
        const timestampMs = (0, webhook_security_1.assertFreshWebhookTimestamp)(timestampHeader);
        const rawBodyText = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);
        const payloadSize = req.rawBody?.length ?? Buffer.byteLength(rawBodyText);
        if (payloadSize > config.webhook.maxPayloadBytes) {
            throw new common_1.BadRequestException('Payload too large');
        }
        const requestId = requestIdHeader || (0, crypto_1.randomUUID)();
        const correlationId = correlationIdHeader || requestId;
        const signature = provider === 'waba' ? wabaSignature : webhookSignature || qrSignature;
        const secret = provider === 'waba' ? config.waba.appSecret : config.webhook.qrSecret;
        const verification = (0, messaging_1.verifyWebhookSignature)({
            provider,
            rawBody: rawBodyText,
            signature,
            secret,
        });
        if (!verification.valid) {
            logger.warn((0, logger_1.createRequestLoggerContext)({
                requestId,
                correlationId,
                provider,
                eventId: eventIdHeader,
            }), `Webhook signature rejected (${verification.status})`);
            throw new common_1.UnauthorizedException('Invalid signature');
        }
        await this.webhooksService.ensureWebhookFreshness({
            provider,
            rawBody: rawBodyText,
            timestampMs,
            signature,
            requestId,
            correlationId,
        });
        const payloadValidation = (0, webhooks_validator_1.validateWebhookPayload)(provider, payload);
        if (!payloadValidation.ok) {
            throw new common_1.BadRequestException(payloadValidation.error || 'Invalid payload');
        }
        const receivedAt = new Date().toISOString();
        const normalization = (0, messaging_1.normalizeWebhookEvent)(provider, payload, {
            receivedAt,
            requestId,
            correlationId,
            eventIdOverride: eventIdHeader,
            tenantId: Array.isArray(req.headers['x-tenant-id'])
                ? req.headers['x-tenant-id'][0]
                : req.headers['x-tenant-id'],
        });
        if (!normalization.ok || !normalization.event) {
            throw new common_1.BadRequestException(normalization.error || 'Invalid payload');
        }
        const event = normalization.event;
        const effectiveRequestId = requestId || event.requestId || event.eventId;
        const effectiveCorrelationId = correlationId || event.correlationId || effectiveRequestId;
        logger.info((0, logger_1.createRequestLoggerContext)({
            provider,
            eventId: event.eventId,
            requestId: effectiveRequestId,
            correlationId: effectiveCorrelationId,
            tenantId: event.tenantId,
        }), 'Webhook received');
        const result = await this.webhooksService.enqueueInboundEvent(event, effectiveRequestId, effectiveCorrelationId);
        return {
            status: result.status,
            eventId: result.eventId,
            requestId,
            correlationId: effectiveCorrelationId,
            signatureStatus: verification.status,
        };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Post)(':provider'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(webhooks_validator_1.webhookBaseSchema))),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Headers)()),
    __param(4, (0, common_1.Headers)('x-request-id')),
    __param(5, (0, common_1.Headers)('x-correlation-id')),
    __param(6, (0, common_1.Headers)('x-event-id')),
    __param(7, (0, common_1.Headers)('content-type')),
    __param(8, (0, common_1.Headers)('x-hub-signature-256')),
    __param(9, (0, common_1.Headers)('x-webhook-signature')),
    __param(10, (0, common_1.Headers)('x-qr-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleWebhook", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [webhooks_service_1.WebhooksService])
], WebhooksController);
