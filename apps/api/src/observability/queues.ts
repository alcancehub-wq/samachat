import { Queue } from 'bullmq';
import type IORedis from 'ioredis';

export const QUEUE_NAMES = [
  'inbound-events',
  'outbound-messages',
  'media-download',
  'dead-letter',
  'campaign-scheduler',
  'campaign-dispatch',
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export function createQueueClients(connection: IORedis) {
  return QUEUE_NAMES.map((queueName) => new Queue(queueName, { connection }));
}
