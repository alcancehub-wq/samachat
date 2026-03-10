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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@samachat/config");
const queues_1 = require("../observability/queues");
let HealthService = class HealthService {
    redis;
    queues = [];
    heartbeatKey;
    heartbeatTtlMs;
    constructor() {
        const { redisUrl } = (0, config_1.getConfig)();
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });
            this.queues = (0, queues_1.createQueueClients)(this.redis);
        }
        const workerId = process.env.WORKER_ID || 'default';
        this.heartbeatKey = `samachat:worker:heartbeat:${workerId}`;
        const ttlSeconds = Number(process.env.WORKER_HEARTBEAT_TTL_SECONDS || 30);
        this.heartbeatTtlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 30000;
    }
    async checkRedis() {
        if (!this.redis) {
            return { ok: false, detail: 'REDIS_URL not set' };
        }
        try {
            await this.redis.ping();
            return { ok: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { ok: false, detail: message };
        }
    }
    async checkQueues() {
        if (!this.redis || this.queues.length === 0) {
            return { ok: false, detail: 'Queues not initialized' };
        }
        try {
            await Promise.all(this.queues.map((queue) => queue.getJobCounts('waiting')));
            return { ok: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { ok: false, detail: message };
        }
    }
    async checkWorkerHeartbeat() {
        if (!this.redis) {
            return { ok: false, detail: 'REDIS_URL not set' };
        }
        try {
            const payload = await this.redis.get(this.heartbeatKey);
            if (!payload) {
                return { ok: false, detail: 'Worker heartbeat missing' };
            }
            const parsed = JSON.parse(payload);
            const timestamp = parsed.timestamp ? Date.parse(parsed.timestamp) : NaN;
            if (!Number.isFinite(timestamp)) {
                return { ok: false, detail: 'Worker heartbeat unreadable' };
            }
            const ageMs = Date.now() - timestamp;
            if (ageMs > this.heartbeatTtlMs) {
                return { ok: false, detail: 'Worker heartbeat stale' };
            }
            return { ok: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { ok: false, detail: message };
        }
    }
    async getReadiness() {
        const [redis, queues, heartbeat] = await Promise.all([
            this.checkRedis(),
            this.checkQueues(),
            this.checkWorkerHeartbeat(),
        ]);
        const ready = redis.ok && queues.ok && heartbeat.ok;
        return {
            status: ready ? 'ready' : 'not-ready',
            checks: {
                redis,
                queues,
                workerHeartbeat: heartbeat,
            },
            timestamp: new Date().toISOString(),
        };
    }
    async getHealth() {
        const readiness = await this.getReadiness();
        return {
            ...readiness,
            uptime: process.uptime(),
        };
    }
    getLiveness() {
        return {
            status: 'alive',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], HealthService);
