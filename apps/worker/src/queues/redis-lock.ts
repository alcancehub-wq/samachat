import type IORedis from 'ioredis';
import { randomUUID } from 'crypto';

export async function acquireQueueLock(
  connection: IORedis,
  key: string,
  ttlMs: number,
): Promise<string | null> {
  const token = randomUUID();
  const result = await connection.set(key, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? token : null;
}

export async function releaseQueueLock(
  connection: IORedis,
  key: string,
  token: string,
): Promise<void> {
  const script =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
  await connection.eval(script, 1, key, token);
}
