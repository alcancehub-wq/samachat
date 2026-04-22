import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getConfig, requireRedisUrl } from '@samachat/config';

export interface WorkerQueues {
  inboundEventsQueue: Queue;
  outboundMessagesQueue: Queue;
  mediaDownloadQueue: Queue;
  deadLetterQueue: Queue;
  campaignSchedulerQueue: Queue;
}

export function createRedisConnection(): IORedis {
  const redisUrl = requireRedisUrl();
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function createQueues(connection: IORedis): WorkerQueues {
  const { queues } = getConfig();
  const buildOptions = (queueConfig: typeof queues.inboundEvents) => ({
    attempts: queueConfig.attempts,
    backoff: { type: 'exponential' as const, delay: queueConfig.backoffMs },
    timeout: queueConfig.timeoutMs,
    removeOnComplete: 1000,
    removeOnFail: 500,
  });

  const inboundEventsQueue = new Queue('inbound-events', {
    connection,
    defaultJobOptions: buildOptions(queues.inboundEvents),
  });
  const outboundMessagesQueue = new Queue('outbound-messages', {
    connection,
    defaultJobOptions: buildOptions(queues.outboundMessages),
  });
  const mediaDownloadQueue = new Queue('media-download', {
    connection,
    defaultJobOptions: buildOptions(queues.mediaDownload),
  });
  const deadLetterQueue = new Queue('dead-letter', {
    connection,
    defaultJobOptions: buildOptions(queues.deadLetter),
  });
  const campaignSchedulerQueue = new Queue('campaign-scheduler', {
    connection,
    defaultJobOptions: buildOptions(queues.outboundMessages),
  });

  return {
    inboundEventsQueue,
    outboundMessagesQueue,
    mediaDownloadQueue,
    deadLetterQueue,
    campaignSchedulerQueue,
  };
}