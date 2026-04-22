import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '@samachat/config';
import { createQueueClients } from '../observability/queues';
import { PrismaService } from '../common/prisma/prisma.service';
import { ConnectionPoolManager } from '../modules/connections/connection-pool.manager';
import { ConnectionStatus } from '@prisma/client';

interface CheckResult {
  ok: boolean;
  detail?: string;
}

@Injectable()
export class HealthService {
  private readonly redis?: IORedis;
  private readonly queues: Queue[] = [];
  private readonly workerHeartbeatRequired: boolean;
  private readonly heartbeatKey: string;
  private readonly heartbeatTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly poolManager: ConnectionPoolManager,
  ) {
    const { redisUrl } = getConfig();
    if (redisUrl) {
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      this.queues = createQueueClients(this.redis);
    }

    const requiredEnv = process.env.WORKER_HEARTBEAT_REQUIRED;
    this.workerHeartbeatRequired =
      requiredEnv === 'true' ||
      (requiredEnv !== 'false' && Boolean(process.env.WORKER_ID));
    const workerId = process.env.WORKER_ID || 'default';
    this.heartbeatKey = `samachat:worker:heartbeat:${workerId}`;
    const ttlSeconds = Number(process.env.WORKER_HEARTBEAT_TTL_SECONDS || 30);
    this.heartbeatTtlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 30000;
  }

  async checkRedis(): Promise<CheckResult> {
    if (!this.redis) {
      return { ok: false, detail: 'REDIS_URL not set' };
    }
    try {
      await this.redis.ping();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { ok: false, detail: message };
    }
  }

  async checkQueues(): Promise<CheckResult> {
    if (!this.redis || this.queues.length === 0) {
      return { ok: false, detail: 'Queues not initialized' };
    }
    try {
      await Promise.all(this.queues.map((queue) => queue.getJobCounts('waiting')));
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { ok: false, detail: message };
    }
  }

  async checkWorkerHeartbeat(): Promise<CheckResult> {
    if (!this.workerHeartbeatRequired) {
      return { ok: true, detail: 'Worker heartbeat check skipped' };
    }
    if (!this.redis) {
      return { ok: false, detail: 'REDIS_URL not set' };
    }
    try {
      const payload = await this.redis.get(this.heartbeatKey);
      if (!payload) {
        return { ok: false, detail: 'Worker heartbeat missing' };
      }
      const parsed = JSON.parse(payload) as { timestamp?: string };
      const timestamp = parsed.timestamp ? Date.parse(parsed.timestamp) : NaN;
      if (!Number.isFinite(timestamp)) {
        return { ok: false, detail: 'Worker heartbeat unreadable' };
      }
      const ageMs = Date.now() - timestamp;
      if (ageMs > this.heartbeatTtlMs) {
        return { ok: false, detail: 'Worker heartbeat stale' };
      }
      return { ok: true };
    } catch (error) {
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
    const connections = await this.getConnectionSummary();
    const workers = await this.poolManager.getWorkerSummary();
    return {
      ...readiness,
      connections,
      workers,
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

  private async getConnectionSummary() {
    const grouped = await this.prisma.whatsappSession.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const summary: Record<string, number> = {};
    for (const status of Object.values(ConnectionStatus)) {
      summary[status] = grouped.find((item) => item.status === status)?._count._all ?? 0;
    }

    return summary;
  }
}
