import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type IORedis from 'ioredis';
import { hostname } from 'os';
import { getLogger } from '@samachat/logger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ConnectionStatus } from './types';
import { SessionManager } from './session.manager';
import { CONNECTIONS_REDIS } from './session.store';

const WORKER_SET_KEY = 'samachat:connections:workers';
const FAILOVER_LOCK_KEY = 'samachat:connections:failover:lock';

interface WorkerSummary {
  workerId: string;
  connections: number;
  capacity: number;
  load: number;
  lastHeartbeat?: string;
}

@Injectable()
export class ConnectionPoolManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'connection-pool' });
  private readonly workerId =
    process.env.CONNECTION_WORKER_ID ||
    process.env.WORKER_ID ||
    `api-${hostname()}-${process.pid}-${Math.random().toString(16).slice(2)}`;
  private readonly heartbeatTtlSeconds = this.readNumber('CONNECTION_WORKER_TTL_SECONDS', 30);
  private readonly heartbeatIntervalMs = this.readNumber(
    'CONNECTION_WORKER_HEARTBEAT_INTERVAL_MS',
    10000,
  );
  private readonly maxConnectionsPerWorker = this.readNumber('MAX_CONNECTIONS_PER_WORKER', 200);
  private heartbeatTimer?: NodeJS.Timeout;
  private reconcileTimer?: NodeJS.Timeout;
  private readonly knownWorkers = new Set<string>();
  private lastWorkerFingerprint = '';

  constructor(
    @Inject(CONNECTIONS_REDIS) private readonly redis: IORedis,
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly sessionManager: SessionManager,
  ) {}

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

  async assignSession(sessionId: string) {
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

  async unassignSession(sessionId: string) {
    const workerId = await this.redis.get(this.sessionKey(sessionId));
    const multi = this.redis.multi().del(this.sessionKey(sessionId));
    if (workerId) {
      multi.srem(this.workerSessionsKey(workerId), sessionId);
    }
    await multi.exec();
  }

  async getWorkerSummary(): Promise<WorkerSummary[]> {
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
    const summaries: WorkerSummary[] = [];

    for (let index = 0; index < workers.length; index += 1) {
      const workerId = workers[index];
      if (!workerId) {
        continue;
      }
      const heartbeatResult = results?.[index * 2];
      const loadResult = results?.[index * 2 + 1];
      const heartbeatRaw = (heartbeatResult?.[1] as string | null) ?? null;
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

  async isAssignedToWorker(sessionId: string, workerId: string) {
    const assigned = await this.redis.get(this.sessionKey(sessionId));
    return assigned === workerId;
  }

  private startHeartbeat() {
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

  private startReconciler() {
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

  private async registerWorker() {
    await this.redis.sadd(WORKER_SET_KEY, this.workerId);
  }

  private async reconcile() {
    const workers = await this.getActiveWorkers();
    await this.updateWorkerMetrics(workers);
    await this.handleFailover(workers);
    await this.syncAssignedSessions();
    await this.rebalanceIfNeeded(workers);
  }

  private async ensureAssignments() {
    const sessions = await this.prisma.whatsappSession.findMany({
      where: {
        status: {
          in: [ConnectionStatus.CONNECTED, ConnectionStatus.RECONNECTING, ConnectionStatus.WAITING_QR],
        },
      },
      select: { session_id: true },
    });

    for (const session of sessions) {
      const existing = await this.redis.get(this.sessionKey(session.session_id));
      if (!existing) {
        try {
          await this.assignSession(session.session_id);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to assign session');
        }
      }
    }
  }

  private async restoreAssignedSessions() {
    const sessionIds = await this.redis.smembers(this.workerSessionsKey(this.workerId));
    await this.startSessionsByIds(sessionIds);
  }

  private async syncAssignedSessions() {
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

  private async startSessionsByIds(sessionIds: string[]) {
    if (sessionIds.length === 0) {
      return;
    }

    const sessions = await this.prisma.whatsappSession.findMany({
      where: {
        session_id: { in: sessionIds },
        status: {
          in: [ConnectionStatus.CONNECTED, ConnectionStatus.RECONNECTING, ConnectionStatus.WAITING_QR],
        },
      },
    });

    for (const session of sessions) {
      try {
        await this.sessionManager.startSession(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to start assigned session');
      }
    }
  }

  private async updateWorkerMetrics(workers: string[]) {
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

  private async handleFailover(workers: string[]) {
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

  private async reassignSession(sessionId: string, fromWorker: string, activeWorkers: string[]) {
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

  private async rebalanceIfNeeded(workers: string[]) {
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
          in: [ConnectionStatus.CONNECTED, ConnectionStatus.RECONNECTING, ConnectionStatus.WAITING_QR],
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

  private async getActiveWorkers(): Promise<string[]> {
    const workers = await this.redis.smembers(WORKER_SET_KEY);
    if (workers.length === 0) {
      return [this.workerId];
    }

    const pipeline = this.redis.pipeline();
    for (const workerId of workers) {
      pipeline.get(this.workerHeartbeatKey(workerId));
    }

    const results = await pipeline.exec();
    const active: string[] = [];

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

  private async findDeadWorkers(): Promise<string[]> {
    const workers = await this.redis.smembers(WORKER_SET_KEY);
    if (workers.length === 0) {
      return [];
    }

    const pipeline = this.redis.pipeline();
    for (const workerId of workers) {
      pipeline.get(this.workerHeartbeatKey(workerId));
    }

    const results = await pipeline.exec();
    const dead: string[] = [];

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

  private async selectWorkerForSession(
    sessionId: string,
    workers: string[],
    avoidWorker?: string,
  ): Promise<string | null> {
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

    let selected: string | null = null;
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

  private getShardWorker(sessionId: string, workers: string[]) {
    const hash = this.hashSession(sessionId);
    const index = workers.length > 0 ? hash % workers.length : 0;
    const selected = workers[index];
    return selected ?? (workers[0] as string);
  }

  private async getWorkerLoads(workers: string[]) {
    const pipeline = this.redis.pipeline();
    for (const workerId of workers) {
      pipeline.scard(this.workerSessionsKey(workerId));
    }

    const results = await pipeline.exec();
    const loads = new Map<string, number>();
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

  private hashSession(sessionId: string) {
    let hash = 2166136261;
    for (let i = 0; i < sessionId.length; i += 1) {
      hash ^= sessionId.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  private parseHeartbeatTimestamp(raw: string | null) {
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as { timestamp?: string };
      return parsed.timestamp;
    } catch {
      return undefined;
    }
  }

  private workerHeartbeatKey(workerId: string) {
    return `samachat:connections:worker:${workerId}:heartbeat`;
  }

  private workerSessionsKey(workerId: string) {
    return `samachat:connections:worker:${workerId}:sessions`;
  }

  private sessionKey(sessionId: string) {
    return `samachat:connections:session:${sessionId}`;
  }

  private readNumber(key: string, fallback: number) {
    const raw = process.env[key];
    if (!raw) {
      return fallback;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
