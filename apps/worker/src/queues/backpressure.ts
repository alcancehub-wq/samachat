import type { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import { incrementQueueMetric, setQueueDepthMetric } from '../observability/queue-metrics';

const logger = getLogger({ service: 'worker', component: 'backpressure' });

export async function applyQueueBackpressure(
  connection: IORedis,
  queue: Queue,
  queueName: string,
): Promise<number> {
  const { queueBackpressure } = getConfig();
  const waiting = await queue.getWaitingCount();
  const delayed = await queue.getDelayedCount();
  const depth = waiting + delayed;

  await setQueueDepthMetric(connection, queueName, depth);

  if (depth < queueBackpressure.threshold) {
    return depth;
  }

  const cooldownKey = `samachat:metrics:queue:${queueName}:backpressure-cooldown`;
  const cooldownMs = queueBackpressure.warningCooldownMs;
  const cooldownSet = await connection.set(
    cooldownKey,
    String(Date.now()),
    'PX',
    cooldownMs,
    'NX',
  );

  if (cooldownSet) {
    await incrementQueueMetric(connection, queueName, 'backpressure');
    logger.warn({ queue: queueName, depth }, 'Queue backpressure applied');
  }

  await new Promise((resolve) => setTimeout(resolve, queueBackpressure.delayMs));
  return depth;
}
