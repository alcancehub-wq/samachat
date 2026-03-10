import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig } from '@samachat/config';
import { createQueueClients } from '../observability/queues';

interface CheckResult {
  ok: boolean;
  detail?: string;
}

@Injectable()
export class HealthService {
  private readonly redis?: IORedis;
  private readonly queues: Queue[] = [];
  private readonly heartbeatKey: string;
  private readonly heartbeatTtlMs: number;

  constructor() {
    const { redisUrl } = getConfig();
    if (redisUrl) {
      this.redis = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      this.queues = createQueueClients(this.redis);
    }

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
}
