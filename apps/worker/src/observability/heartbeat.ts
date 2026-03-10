import type IORedis from 'ioredis';
import { hostname } from 'os';
import { getLogger } from '@samachat/logger';

const logger = getLogger({ service: 'worker', component: 'heartbeat' });

export function startWorkerHeartbeat(connection: IORedis) {
  const workerId =
    process.env.WORKER_ID || `worker-${hostname()}-${process.pid}-${Math.random().toString(16).slice(2)}`;
  const key = `samachat:worker:heartbeat:${workerId}`;
  const ttlSeconds = Number(process.env.WORKER_HEARTBEAT_TTL_SECONDS || 30);
  const intervalMs = Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS || 10000);
  const safeTtl = Number.isFinite(ttlSeconds) ? ttlSeconds : 30;
  const safeInterval = Number.isFinite(intervalMs) ? intervalMs : 10000;

  const sendHeartbeat = async () => {
    const payload = {
      workerId,
      service: 'worker',
      timestamp: new Date().toISOString(),
    };
    await connection.set(key, JSON.stringify(payload), 'EX', safeTtl);
  };

  sendHeartbeat().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: message }, 'Worker heartbeat failed');
  });

  const interval = setInterval(() => {
    sendHeartbeat().catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn({ error: message }, 'Worker heartbeat failed');
    });
  }, safeInterval);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }

  return interval;
}
