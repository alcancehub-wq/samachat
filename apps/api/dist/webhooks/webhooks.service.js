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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const trace_1 = require("../observability/trace");
const idempotency_1 = require("./idempotency");
let WebhooksService = class WebhooksService {
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'webhooks' });
    tracer = (0, trace_1.getTracer)();
    redis;
    inboundQueue;
    replayTtlSeconds = 5 * 60;
    constructor() {
        const { redisUrl } = (0, config_1.getConfig)();
        if (!redisUrl) {
            this.logger.warn('REDIS_URL not set; webhook queueing disabled');
            return;
        }
        this.redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        this.inboundQueue = new bullmq_1.Queue('inbound-events', { connection: this.redis });
    }
    async enqueueInboundEvent(event, requestId, correlationId) {
        const inboundQueue = this.inboundQueue;
        if (!this.redis || !inboundQueue) {
            throw new common_1.ServiceUnavailableException('Webhook queueing unavailable');
        }
        const { webhook } = (0, config_1.getConfig)();
        const dedupeResult = await (0, idempotency_1.checkAndSetIdempotency)(this.redis, event, requestId, webhook.idempotencyTtlSeconds);
        if (!dedupeResult) {
            this.logger.info({ provider: event.provider, eventId: event.eventId, requestId, correlationId }, 'Webhook event deduplicated');
            return { status: 'duplicate', eventId: event.eventId };
        }
        await this.tracer.startActiveSpan('queue.enqueue inbound-events', async (span) => {
            const trace = (0, trace_1.injectTraceContext)();
            await inboundQueue.add('inbound-event', { event, requestId, correlationId, trace }, { jobId: `${event.provider}:${event.eventId}` });
            span.setAttribute('queue.name', 'inbound-events');
            span.setAttribute('event.id', event.eventId);
            span.end();
        });
        this.logger.info({ provider: event.provider, eventId: event.eventId, requestId, correlationId }, 'Inbound event queued');
        return { status: 'queued', eventId: event.eventId };
    }
    async ensureWebhookFreshness(params) {
        const redis = this.redis;
        if (!redis) {
            throw new common_1.ServiceUnavailableException('Webhook security unavailable');
        }
        const replayAllowed = await (0, idempotency_1.checkAndSetReplayProtection)(redis, params.provider, params.rawBody, params.timestampMs, params.signature, this.replayTtlSeconds);
        if (!replayAllowed) {
            this.logger.warn({
                provider: params.provider,
                requestId: params.requestId,
                correlationId: params.correlationId,
            }, 'Webhook replay rejected');
            throw new common_1.UnauthorizedException('Replay detected');
        }
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WebhooksService);
