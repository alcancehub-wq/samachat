"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./observability/otel");
const logger_1 = require("@samachat/logger");
const config_1 = require("@samachat/config");
const campaignScheduler_processor_1 = require("./processors/campaignScheduler.processor");
const queues_1 = require("./queues");
const inbound_processor_1 = require("./queues/inbound.processor");
const outbound_processor_1 = require("./queues/outbound.processor");
const media_download_processor_1 = require("./queues/media-download.processor");
const dead_letter_processor_1 = require("./queues/dead-letter.processor");
const heartbeat_1 = require("./observability/heartbeat");
function bootstrap() {
    process.env.SAMACHAT_SERVICE = process.env.SAMACHAT_SERVICE || 'worker';
    const logger = (0, logger_1.getLogger)({ service: 'worker' });
    const config = (0, config_1.getConfig)();
    let connection;
    try {
        connection = (0, queues_1.createRedisConnection)();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn({ error: message }, 'REDIS_URL not set; worker will not start');
        return;
    }
    const queues = (0, queues_1.createQueues)(connection);
    (0, heartbeat_1.startWorkerHeartbeat)(connection);
    (0, inbound_processor_1.startInboundProcessor)(connection, queues);
    (0, outbound_processor_1.startOutboundProcessor)(connection, queues);
    (0, media_download_processor_1.startMediaDownloadProcessor)(connection, queues);
    (0, dead_letter_processor_1.startDeadLetterProcessor)(connection);
    (0, campaignScheduler_processor_1.startCampaignSchedulerProcessor)(connection);
    logger.info({
        providerMode: config.providerMode,
        queues: Object.keys(queues),
    }, 'Worker started');
}
bootstrap();
