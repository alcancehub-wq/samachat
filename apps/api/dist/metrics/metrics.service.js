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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const prom_client_1 = require("prom-client");
const config_1 = require("@samachat/config");
const queues_1 = require("../observability/queues");
const METRIC_PREFIX = 'samachat';
let MetricsService = class MetricsService {
    registry = new prom_client_1.Registry();
    redis;
    queues = [];
    queueDepthGauge;
    queueCompletedGauge;
    queueFailedGauge;
    queueRetriesGauge;
    queueDlqGauge;
    messagesReceivedCounter;
    messagesSentCounter;
    automationExecutionsCounter;
    eventsProcessedCounter;
    eventsFailedCounter;
    connectionsGauge;
    connectionsPerWorkerGauge;
    workerLoadGauge;
    reconnectEventsCounter;
    constructor() {
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry, prefix: `${METRIC_PREFIX}_` });
        this.queueDepthGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_queue_depth`,
            help: 'Approximate queue depth (waiting + active + delayed).',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.queueCompletedGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_queue_jobs_completed_total`,
            help: 'Total jobs completed, tracked by worker events.',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.queueFailedGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_queue_jobs_failed_total`,
            help: 'Total jobs failed after retries, tracked by worker events.',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.queueRetriesGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_queue_retries_total`,
            help: 'Total job retries, tracked by worker events.',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.queueDlqGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_queue_dlq_size`,
            help: 'Dead-letter queue size.',
            labelNames: ['queue'],
            registers: [this.registry],
        });
        this.messagesReceivedCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_messages_received_total`,
            help: 'Total inbound messages received.',
            registers: [this.registry],
        });
        this.messagesSentCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_messages_sent_total`,
            help: 'Total outbound messages sent.',
            registers: [this.registry],
        });
        this.automationExecutionsCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_automation_executions_total`,
            help: 'Total automation actions executed.',
            registers: [this.registry],
        });
        this.eventsProcessedCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_events_processed_total`,
            help: 'Total events processed from Redis pipeline.',
            registers: [this.registry],
        });
        this.eventsFailedCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_events_failed_total`,
            help: 'Total events failed while processing.',
            registers: [this.registry],
        });
        this.connectionsGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_active_connections`,
            help: 'Active WhatsApp connections by status.',
            labelNames: ['status'],
            registers: [this.registry],
        });
        this.connectionsPerWorkerGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_connections_per_worker`,
            help: 'Active WhatsApp connections per worker.',
            labelNames: ['worker'],
            registers: [this.registry],
        });
        this.workerLoadGauge = new prom_client_1.Gauge({
            name: `${METRIC_PREFIX}_worker_load`,
            help: 'Worker load ratio based on max connections per worker.',
            labelNames: ['worker'],
            registers: [this.registry],
        });
        this.reconnectEventsCounter = new prom_client_1.Counter({
            name: `${METRIC_PREFIX}_reconnect_events_total`,
            help: 'Total reconnection attempts scheduled.',
            registers: [this.registry],
        });
        const { redisUrl } = (0, config_1.getConfig)();
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });
            this.queues = (0, queues_1.createQueueClients)(this.redis);
        }
    }
    async getMetrics() {
        await this.updateQueueMetrics();
        return this.registry.metrics();
    }
    getContentType() {
        return this.registry.contentType;
    }
    incrementMessagesReceived(amount = 1) {
        this.messagesReceivedCounter.inc(amount);
    }
    incrementMessagesSent(amount = 1) {
        this.messagesSentCounter.inc(amount);
    }
    incrementAutomationExecutions(amount = 1) {
        this.automationExecutionsCounter.inc(amount);
    }
    incrementEventsProcessed(amount = 1) {
        this.eventsProcessedCounter.inc(amount);
    }
    incrementEventsFailed(amount = 1) {
        this.eventsFailedCounter.inc(amount);
    }
    setConnectionStatusCount(status, count) {
        this.connectionsGauge.set({ status }, count);
    }
    setConnectionsPerWorker(worker, count) {
        this.connectionsPerWorkerGauge.set({ worker }, count);
    }
    setWorkerLoad(worker, load) {
        this.workerLoadGauge.set({ worker }, load);
    }
    incrementReconnectEvents(amount = 1) {
        this.reconnectEventsCounter.inc(amount);
    }
    async updateQueueMetrics() {
        const redis = this.redis;
        if (!redis || this.queues.length === 0) {
            return;
        }
        await Promise.all(this.queues.map(async (queue) => {
            try {
                const counts = await queue.getJobCounts('waiting', 'active', 'delayed');
                const depth = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
                this.queueDepthGauge.set({ queue: queue.name }, depth);
                const metricsKey = `samachat:metrics:queue:${queue.name}`;
                const metrics = await redis.hgetall(metricsKey);
                const completed = Number(metrics.completed || 0);
                const failed = Number(metrics.failed || 0);
                const retries = Number(metrics.retries || 0);
                this.queueCompletedGauge.set({ queue: queue.name }, completed);
                this.queueFailedGauge.set({ queue: queue.name }, failed);
                this.queueRetriesGauge.set({ queue: queue.name }, retries);
                if (queue.name === 'dead-letter') {
                    this.queueDlqGauge.set({ queue: queue.name }, depth);
                }
                else {
                    this.queueDlqGauge.set({ queue: queue.name }, 0);
                }
            }
            catch {
                this.queueDepthGauge.set({ queue: queue.name }, 0);
                this.queueCompletedGauge.set({ queue: queue.name }, 0);
                this.queueFailedGauge.set({ queue: queue.name }, 0);
                this.queueRetriesGauge.set({ queue: queue.name }, 0);
                this.queueDlqGauge.set({ queue: queue.name }, 0);
            }
        }));
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
