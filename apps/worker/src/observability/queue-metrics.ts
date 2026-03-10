import type IORedis from 'ioredis';
import { getLogger } from '@samachat/logger';

export type QueueMetric = 'completed' | 'failed' | 'retries';

const logger = getLogger({ service: 'worker', component: 'queue-metrics' });

export async function incrementQueueMetric(
  connection: IORedis,
  queueName: string,
  metric: QueueMetric,
  amount = 1,
) {
  try {
    const key = `samachat:metrics:queue:${queueName}`;
    await connection.hincrby(key, metric, amount);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: message, queue: queueName, metric }, 'Failed to update queue metrics');
  }
}
