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
exports.ConnectionPoolManager = void 0;
const common_1 = require("@nestjs/common");
const os_1 = require("os");
const logger_1 = require("@samachat/logger");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const metrics_service_1 = require("../../metrics/metrics.service");
const types_1 = require("./types");
const session_manager_1 = require("./session.manager");
const session_store_1 = require("./session.store");
const WORKER_SET_KEY = 'samachat:connections:workers';
const FAILOVER_LOCK_KEY = 'samachat:connections:failover:lock';
let ConnectionPoolManager = class ConnectionPoolManager {
    redis;
    prisma;
    metrics;
    sessionManager;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'connection-pool' });
    workerId = process.env.CONNECTION_WORKER_ID ||
        process.env.WORKER_ID ||
        `api-${(0, os_1.hostname)()}-${process.pid}-${Math.random().toString(16).slice(2)}`;
    heartbeatTtlSeconds = this.readNumber('CONNECTION_WORKER_TTL_SECONDS', 30);
    heartbeatIntervalMs = this.readNumber('CONNECTION_WORKER_HEARTBEAT_INTERVAL_MS', 10000);
    maxConnectionsPerWorker = this.readNumber('MAX_CONNECTIONS_PER_WORKER', 200);
    heartbeatTimer;
    reconcileTimer;
    knownWorkers = new Set();
    lastWorkerFingerprint = '';
    constructor(redis, prisma, metrics, sessionManager) {
        this.redis = redis;
        this.prisma = prisma;
        this.metrics = metrics;
        this.sessionManager = sessionManager;
    }
    async onModuleInit() {
        await this.registerWorker();
        await this.ensureAssignments();
        await this.restoreAssignedSessions();
        this.startHeartbeat();
        this.startReconciler();
    }
    async onModuleDestroy() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        if (this.reconcileTimer) {
            clearInterval(this.reconcileTimer);
        }
    }
    getWorkerId() {
        return this.workerId;
    }
    async assignSession(sessionId) {
        const existing = await this.redis.get(this.sessionKey(sessionId));
        if (existing) {
            return existing;
        }
        const workers = await this.getActiveWorkers();
        const selected = await this.selectWorkerForSession(sessionId, workers);
        if (!selected) {
            throw new Error('No workers available');
        }
        await this.redis
            .multi()
            .set(this.sessionKey(sessionId), selected)
            .sadd(this.workerSessionsKey(selected), sessionId)
            .exec();
        return selected;
    }
    async unassignSession(sessionId) {
        const workerId = await this.redis.get(this.sessionKey(sessionId));
        const multi = this.redis.multi().del(this.sessionKey(sessionId));
        if (workerId) {
            multi.srem(this.workerSessionsKey(workerId), sessionId);
        }
        await multi.exec();
    }
    async getWorkerSummary() {
        const workers = await this.getActiveWorkers();
        if (workers.length === 0) {
            return [];
        }
        const pipeline = this.redis.pipeline();
        for (const workerId of workers) {
            pipeline.get(this.workerHeartbeatKey(workerId));
            pipeline.scard(this.workerSessionsKey(workerId));
        }
        const results = await pipeline.exec();
        const summaries = [];
        for (let index = 0; index < workers.length; index += 1) {
            const workerId = workers[index];
            if (!workerId) {
                continue;
            }
            const heartbeatResult = results?.[index * 2];
            const loadResult = results?.[index * 2 + 1];
            const heartbeatRaw = heartbeatResult?.[1] ?? null;
            const connections = Number(loadResult?.[1] ?? 0);
            const lastHeartbeat = this.parseHeartbeatTimestamp(heartbeatRaw);
            const load = this.maxConnectionsPerWorker > 0 ? connections / this.maxConnectionsPerWorker : 0;
            summaries.push({
                workerId,
                connections,
                capacity: this.maxConnectionsPerWorker,
                load,
                lastHeartbeat,
            });
        }
        return summaries;
    }
    async isAssignedToWorker(sessionId, workerId) {
        const assigned = await this.redis.get(this.sessionKey(sessionId));
        return assigned === workerId;
    }
    startHeartbeat() {
        const sendHeartbeat = async () => {
            const payload = JSON.stringify({
                workerId: this.workerId,
                service: 'connections',
                timestamp: new Date().toISOString(),
            });
            await this.redis.set(this.workerHeartbeatKey(this.workerId), payload, 'EX', this.heartbeatTtlSeconds);
            await this.redis.sadd(WORKER_SET_KEY, this.workerId);
        };
        sendHeartbeat().catch((error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: message }, 'Failed to send connection worker heartbeat');
        });
        this.heartbeatTimer = setInterval(() => {
            sendHeartbeat().catch((error) => {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ error: message }, 'Failed to send connection worker heartbeat');
            });
        }, this.heartbeatIntervalMs);
        if (this.heartbeatTimer && typeof this.heartbeatTimer.unref === 'function') {
            this.heartbeatTimer.unref();
        }
    }
    startReconciler() {
        this.reconcileTimer = setInterval(() => {
            void this.reconcile().catch((error) => {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ error: message }, 'Failed to reconcile connection pool');
            });
        }, 15000);
        if (this.reconcileTimer && typeof this.reconcileTimer.unref === 'function') {
            this.reconcileTimer.unref();
        }
    }
    async registerWorker() {
        await this.redis.sadd(WORKER_SET_KEY, this.workerId);
    }
    async reconcile() {
        const workers = await this.getActiveWorkers();
        await this.updateWorkerMetrics(workers);
        await this.handleFailover(workers);
        await this.syncAssignedSessions();
        await this.rebalanceIfNeeded(workers);
    }
    async ensureAssignments() {
        const sessions = await this.prisma.whatsappSession.findMany({
            where: {
                status: {
                    in: [types_1.ConnectionStatus.CONNECTED, types_1.ConnectionStatus.RECONNECTING, types_1.ConnectionStatus.WAITING_QR],
                },
            },
            select: { session_id: true },
        });
        for (const session of sessions) {
            const existing = await this.redis.get(this.sessionKey(session.session_id));
            if (!existing) {
                try {
                    await this.assignSession(session.session_id);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to assign session');
                }
            }
        }
    }
    async restoreAssignedSessions() {
        const sessionIds = await this.redis.smembers(this.workerSessionsKey(this.workerId));
        await this.startSessionsByIds(sessionIds);
    }
    async syncAssignedSessions() {
        const sessionIds = await this.redis.smembers(this.workerSessionsKey(this.workerId));
        if (sessionIds.length === 0) {
            return;
        }
        const missing = sessionIds.filter((sessionId) => !this.sessionManager.hasSession(sessionId));
        if (missing.length === 0) {
            return;
        }
        await this.startSessionsByIds(missing);
    }
    async startSessionsByIds(sessionIds) {
        if (sessionIds.length === 0) {
            return;
        }
        const sessions = await this.prisma.whatsappSession.findMany({
            where: {
                session_id: { in: sessionIds },
                status: {
                    in: [types_1.ConnectionStatus.CONNECTED, types_1.ConnectionStatus.RECONNECTING, types_1.ConnectionStatus.WAITING_QR],
                },
            },
        });
        for (const session of sessions) {
            try {
                await this.sessionManager.startSession(session);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to start assigned session');
            }
        }
    }
    async updateWorkerMetrics(workers) {
        const active = new Set(workers);
        for (const workerId of this.knownWorkers) {
            if (!active.has(workerId)) {
                this.metrics.setConnectionsPerWorker(workerId, 0);
                this.metrics.setWorkerLoad(workerId, 0);
            }
        }
        const pipeline = this.redis.pipeline();
        for (const workerId of workers) {
            pipeline.scard(this.workerSessionsKey(workerId));
        }
        const results = await pipeline.exec();
        for (let index = 0; index < workers.length; index += 1) {
            const workerId = workers[index];
            if (!workerId) {
                continue;
            }
            const count = Number(results?.[index]?.[1] ?? 0);
            const load = this.maxConnectionsPerWorker > 0 ? count / this.maxConnectionsPerWorker : 0;
            this.metrics.setConnectionsPerWorker(workerId, count);
            this.metrics.setWorkerLoad(workerId, load);
            this.knownWorkers.add(workerId);
        }
    }
    async handleFailover(workers) {
        const deadWorkers = await this.findDeadWorkers();
        if (deadWorkers.length === 0) {
            return;
        }
        const lock = await this.redis.set(FAILOVER_LOCK_KEY, this.workerId, 'EX', 15, 'NX');
        if (!lock) {
            return;
        }
        const activeWorkers = workers.filter((workerId) => !deadWorkers.includes(workerId));
        for (const deadWorker of deadWorkers) {
            const sessions = await this.redis.smembers(this.workerSessionsKey(deadWorker));
            for (const sessionId of sessions) {
                await this.reassignSession(sessionId, deadWorker, activeWorkers);
            }
            await this.redis.srem(WORKER_SET_KEY, deadWorker);
            await this.redis.del(this.workerSessionsKey(deadWorker));
        }
    }
    async reassignSession(sessionId, fromWorker, activeWorkers) {
        const selected = await this.selectWorkerForSession(sessionId, activeWorkers, fromWorker);
        if (!selected) {
            return;
        }
        await this.redis
            .multi()
            .set(this.sessionKey(sessionId), selected)
            .srem(this.workerSessionsKey(fromWorker), sessionId)
            .sadd(this.workerSessionsKey(selected), sessionId)
            .exec();
        if (selected === this.workerId) {
            await this.startSessionsByIds([sessionId]);
        }
    }
    async rebalanceIfNeeded(workers) {
        const fingerprint = workers.join('|');
        if (fingerprint === this.lastWorkerFingerprint) {
            return;
        }
        this.lastWorkerFingerprint = fingerprint;
        if (workers.length === 0) {
            return;
        }
        const sessions = await this.prisma.whatsappSession.findMany({
            where: {
                status: {
                    in: [types_1.ConnectionStatus.CONNECTED, types_1.ConnectionStatus.RECONNECTING, types_1.ConnectionStatus.WAITING_QR],
                },
            },
            select: { session_id: true },
        });
        for (const session of sessions) {
            const assigned = await this.redis.get(this.sessionKey(session.session_id));
            const target = this.getShardWorker(session.session_id, workers);
            if (assigned && assigned === target) {
                continue;
            }
            if (assigned && assigned !== target) {
                await this.reassignSession(session.session_id, assigned, workers);
                continue;
            }
            if (!assigned) {
                await this.assignSession(session.session_id);
            }
        }
    }
    async getActiveWorkers() {
        const workers = await this.redis.smembers(WORKER_SET_KEY);
        if (workers.length === 0) {
            return [this.workerId];
        }
        const pipeline = this.redis.pipeline();
        for (const workerId of workers) {
            pipeline.get(this.workerHeartbeatKey(workerId));
        }
        const results = await pipeline.exec();
        const active = [];
        for (let index = 0; index < workers.length; index += 1) {
            const workerId = workers[index];
            if (!workerId) {
                continue;
            }
            const heartbeat = results?.[index]?.[1];
            if (heartbeat) {
                active.push(workerId);
            }
        }
        return active.sort();
    }
    async findDeadWorkers() {
        const workers = await this.redis.smembers(WORKER_SET_KEY);
        if (workers.length === 0) {
            return [];
        }
        const pipeline = this.redis.pipeline();
        for (const workerId of workers) {
            pipeline.get(this.workerHeartbeatKey(workerId));
        }
        const results = await pipeline.exec();
        const dead = [];
        for (let index = 0; index < workers.length; index += 1) {
            const workerId = workers[index];
            if (!workerId) {
                continue;
            }
            const heartbeat = results?.[index]?.[1];
            if (!heartbeat) {
                dead.push(workerId);
            }
        }
        return dead;
    }
    async selectWorkerForSession(sessionId, workers, avoidWorker) {
        if (workers.length === 0) {
            return null;
        }
        const sorted = [...workers].sort();
        const shard = this.getShardWorker(sessionId, sorted);
        const loads = await this.getWorkerLoads(sorted);
        const shardLoad = loads.get(shard) ?? 0;
        if (shard !== avoidWorker && shardLoad < this.maxConnectionsPerWorker) {
            return shard;
        }
        let selected = null;
        let lowestLoad = Number.MAX_SAFE_INTEGER;
        for (const workerId of sorted) {
            if (workerId === avoidWorker) {
                continue;
            }
            const load = loads.get(workerId) ?? 0;
            if (load < this.maxConnectionsPerWorker && load < lowestLoad) {
                lowestLoad = load;
                selected = workerId;
            }
        }
        return selected;
    }
    getShardWorker(sessionId, workers) {
        const hash = this.hashSession(sessionId);
        const index = workers.length > 0 ? hash % workers.length : 0;
        const selected = workers[index];
        return selected ?? workers[0];
    }
    async getWorkerLoads(workers) {
        const pipeline = this.redis.pipeline();
        for (const workerId of workers) {
            pipeline.scard(this.workerSessionsKey(workerId));
        }
        const results = await pipeline.exec();
        const loads = new Map();
        for (let index = 0; index < workers.length; index += 1) {
            const workerId = workers[index];
            if (!workerId) {
                continue;
            }
            const count = Number(results?.[index]?.[1] ?? 0);
            loads.set(workerId, count);
        }
        return loads;
    }
    hashSession(sessionId) {
        let hash = 2166136261;
        for (let i = 0; i < sessionId.length; i += 1) {
            hash ^= sessionId.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return hash >>> 0;
    }
    parseHeartbeatTimestamp(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(raw);
            return parsed.timestamp;
        }
        catch {
            return undefined;
        }
    }
    workerHeartbeatKey(workerId) {
        return `samachat:connections:worker:${workerId}:heartbeat`;
    }
    workerSessionsKey(workerId) {
        return `samachat:connections:worker:${workerId}:sessions`;
    }
    sessionKey(sessionId) {
        return `samachat:connections:session:${sessionId}`;
    }
    readNumber(key, fallback) {
        const raw = process.env[key];
        if (!raw) {
            return fallback;
        }
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
};
exports.ConnectionPoolManager = ConnectionPoolManager;
exports.ConnectionPoolManager = ConnectionPoolManager = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function, prisma_service_1.PrismaService,
        metrics_service_1.MetricsService,
        session_manager_1.SessionManager])
], ConnectionPoolManager);
