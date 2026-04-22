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
exports.ObservabilityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const session_store_1 = require("../modules/connections/session.store");
const metrics_service_1 = require("./metrics.service");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let ObservabilityService = class ObservabilityService {
    redis;
    metrics;
    prisma;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'observability' });
    subscriber;
    statusCounts = new Map();
    sessionStatuses = new Map();
    failureTimestamps = [];
    constructor(redis, metrics, prisma) {
        this.redis = redis;
        this.metrics = metrics;
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.loadConnectionCounts();
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('samachat.events');
        this.subscriber.on('message', (_channel, rawMessage) => {
            void this.handleEvent(rawMessage);
        });
        this.subscriber.on('error', (error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: message }, 'Redis subscriber error');
            void this.sendAlert('redis_disconnected', { error: message });
        });
    }
    async onModuleDestroy() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe('samachat.events');
            await this.subscriber.quit();
        }
    }
    async handleEvent(rawMessage) {
        let envelope;
        try {
            envelope = JSON.parse(rawMessage);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: message }, 'Failed to parse event');
            this.metrics.incrementEventsFailed();
            return;
        }
        this.metrics.incrementEventsProcessed();
        const event = envelope.event;
        const payload = envelope.payload ?? {};
        if (event === 'message_received') {
            this.metrics.incrementMessagesReceived();
        }
        if (event === 'message_sent') {
            this.metrics.incrementMessagesSent();
        }
        if (event === 'automation_executed') {
            this.metrics.incrementAutomationExecutions();
        }
        if (event === 'automation_failed') {
            this.metrics.incrementEventsFailed();
        }
        if (event === 'connection_status') {
            const status = String(payload.status ?? 'unknown');
            const sessionId = payload.session_id;
            if (typeof sessionId === 'string') {
                this.applyConnectionStatus(sessionId, status);
            }
            if (status === client_1.ConnectionStatus.DISCONNECTED) {
                void this.sendAlert('connection_lost', payload);
            }
        }
        if (event === 'connection_reconnect') {
            this.metrics.incrementReconnectEvents();
        }
        if (event === 'message_failed') {
            this.trackMessageFailure();
            this.metrics.incrementEventsFailed();
        }
    }
    async loadConnectionCounts() {
        const grouped = await this.prisma.whatsappSession.groupBy({
            by: ['status'],
            _count: { _all: true },
        });
        const sessions = await this.prisma.whatsappSession.findMany({
            select: { session_id: true, status: true },
        });
        for (const session of sessions) {
            this.sessionStatuses.set(session.session_id, session.status);
        }
        const knownStatuses = Object.values(client_1.ConnectionStatus);
        for (const status of knownStatuses) {
            const count = grouped.find((item) => item.status === status)?._count._all ?? 0;
            this.statusCounts.set(status, count);
            this.metrics.setConnectionStatusCount(status, count);
        }
    }
    applyConnectionStatus(sessionId, status) {
        const previous = this.sessionStatuses.get(sessionId);
        if (previous) {
            const prevCount = this.statusCounts.get(previous) ?? 0;
            this.statusCounts.set(previous, Math.max(prevCount - 1, 0));
        }
        this.sessionStatuses.set(sessionId, status);
        const nextCount = (this.statusCounts.get(status) ?? 0) + 1;
        this.statusCounts.set(status, nextCount);
        for (const [key, value] of this.statusCounts.entries()) {
            this.metrics.setConnectionStatusCount(key, value);
        }
    }
    trackMessageFailure() {
        const now = Date.now();
        const config = (0, config_1.getConfig)();
        const windowMs = config.alerts.messageFailureWindowSeconds * 1000;
        this.failureTimestamps.push(now);
        while (this.failureTimestamps.length > 0) {
            const oldest = this.failureTimestamps[0];
            if (oldest === undefined || oldest >= now - windowMs) {
                break;
            }
            this.failureTimestamps.shift();
        }
        if (this.failureTimestamps.length >= config.alerts.messageFailureThreshold) {
            void this.sendAlert('message_failures_spike', {
                count: this.failureTimestamps.length,
                windowSeconds: config.alerts.messageFailureWindowSeconds,
            });
        }
    }
    async sendAlert(event, payload) {
        const { alerts } = (0, config_1.getConfig)();
        if (!alerts.webhookUrl) {
            return;
        }
        try {
            await fetch(alerts.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: message }, 'Failed to send alert webhook');
        }
    }
};
exports.ObservabilityService = ObservabilityService;
exports.ObservabilityService = ObservabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function, metrics_service_1.MetricsService,
        prisma_service_1.PrismaService])
], ObservabilityService);
