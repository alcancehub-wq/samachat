import './observability/otel';
import { getLogger } from '@samachat/logger';
import { getConfig } from '@samachat/config';
import { startCampaignSchedulerProcessor } from './processors/campaignScheduler.processor';
import { createQueues, createRedisConnection } from './queues';
import { startInboundProcessor } from './queues/inbound.processor';
import { startOutboundProcessor } from './queues/outbound.processor';
import { startMediaDownloadProcessor } from './queues/media-download.processor';
import { startDeadLetterProcessor } from './queues/dead-letter.processor';
import { startWorkerHeartbeat } from './observability/heartbeat';

function bootstrap() {
  process.env.SAMACHAT_SERVICE = process.env.SAMACHAT_SERVICE || 'worker';
  const logger = getLogger({ service: 'worker' });
  const config = getConfig();

  let connection;
  try {
    connection = createRedisConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: message }, 'REDIS_URL not set; worker will not start');
    return;
  }

  const queues = createQueues(connection);
  startWorkerHeartbeat(connection);
  startInboundProcessor(connection, queues);
  startOutboundProcessor(connection, queues);
  startMediaDownloadProcessor(connection, queues);
  startDeadLetterProcessor(connection);
  startCampaignSchedulerProcessor(connection);

  logger.info(
    {
      providerMode: config.providerMode,
      queues: Object.keys(queues),
    },
    'Worker started',
  );
}

bootstrap();
