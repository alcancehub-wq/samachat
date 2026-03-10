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
exports.WabaController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const messaging_1 = require("@samachat/messaging");
const webhooks_service_1 = require("../webhooks/webhooks.service");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const webhook_security_1 = require("../webhooks/webhook.security");
const webhooks_validator_1 = require("../webhooks/webhooks.validator");
const logger = (0, logger_1.getLogger)({ provider: 'waba', service: 'api' });
let WabaController = class WabaController {
    webhooksService;
    constructor(webhooksService) {
        this.webhooksService = webhooksService;
    }
    verifyWebhook(query) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        const { waba } = (0, config_1.getConfig)();
        if (mode === 'subscribe' && token && token === waba.verifyToken) {
            logger.info({ mode }, 'WABA webhook verified');
            return challenge;
        }
        throw new common_1.UnauthorizedException('Invalid verify token');
    }
    async handleWebhook(req, payload, headers, signature) {
        const config = (0, config_1.getConfig)();
        const rawBodyText = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload ?? {});
        const requestId = Array.isArray(headers['x-request-id'])
            ? headers['x-request-id'][0]
            : headers['x-request-id'];
        const correlationId = Array.isArray(headers['x-correlation-id'])
            ? headers['x-correlation-id'][0]
            : headers['x-correlation-id'];
        const eventIdHeader = Array.isArray(headers['x-event-id'])
            ? headers['x-event-id'][0]
            : headers['x-event-id'];
        const timestampHeader = (0, webhook_security_1.getWebhookTimestampHeader)(headers);
        const timestampMs = (0, webhook_security_1.assertFreshWebhookTimestamp)(timestampHeader);
        const verification = (0, messaging_1.verifyWebhookSignature)({
            provider: 'waba',
            rawBody: rawBodyText,
            signature,
            secret: config.waba.appSecret,
        });
        if (!verification.valid) {
            logger.warn((0, logger_1.createRequestLoggerContext)({
                requestId,
                correlationId,
                provider: 'waba',
                eventId: eventIdHeader,
            }), `WABA webhook signature rejected (${verification.status})`);
            throw new common_1.UnauthorizedException('Invalid signature');
        }
        await this.webhooksService.ensureWebhookFreshness({
            provider: 'waba',
            rawBody: rawBodyText,
            timestampMs,
            signature,
            requestId: requestId || '',
            correlationId: correlationId || requestId || '',
        });
        const receivedAt = new Date().toISOString();
        const normalization = (0, messaging_1.normalizeWebhookEvent)('waba', payload ?? {}, {
            receivedAt,
            requestId,
            correlationId,
            eventIdOverride: eventIdHeader,
            tenantId: Array.isArray(headers['x-tenant-id'])
                ? headers['x-tenant-id'][0]
                : headers['x-tenant-id'],
        });
        if (!normalization.ok || !normalization.event) {
            throw new common_1.UnauthorizedException('Invalid webhook payload');
        }
        const event = normalization.event;
        const effectiveRequestId = requestId || event.requestId || event.eventId;
        const effectiveCorrelationId = correlationId || event.correlationId || effectiveRequestId;
        await this.webhooksService.enqueueInboundEvent(event, effectiveRequestId, effectiveCorrelationId);
        logger.info((0, logger_1.createRequestLoggerContext)({
            requestId: effectiveRequestId,
            correlationId: effectiveCorrelationId,
            provider: 'waba',
            eventId: event.eventId,
            tenantId: event.tenantId,
        }), 'WABA webhook received');
        return { received: true, eventId: event.eventId };
    }
};
exports.WabaController = WabaController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WabaController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(webhooks_validator_1.wabaWebhookSchema))),
    __param(2, (0, common_1.Headers)()),
    __param(3, (0, common_1.Headers)('x-hub-signature-256')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], WabaController.prototype, "handleWebhook", null);
exports.WabaController = WabaController = __decorate([
    (0, common_1.Controller)('waba'),
    __metadata("design:paramtypes", [webhooks_service_1.WebhooksService])
], WabaController);
