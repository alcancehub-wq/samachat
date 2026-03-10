"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisConnection = createRedisConnection;
exports.createQueues = createQueues;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@samachat/config");
function createRedisConnection() {
    const redisUrl = (0, config_1.requireRedisUrl)();
    return new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    });
}
function createQueues(connection) {
    const { queues } = (0, config_1.getConfig)();
    const buildOptions = (queueConfig) => ({
        attempts: queueConfig.attempts,
        backoff: { type: 'exponential', delay: queueConfig.backoffMs },
        timeout: queueConfig.timeoutMs,
        removeOnComplete: 1000,
        removeOnFail: 500,
    });
    const inboundEventsQueue = new bullmq_1.Queue('inbound-events', {
        connection,
        defaultJobOptions: buildOptions(queues.inboundEvents),
    });
    const outboundMessagesQueue = new bullmq_1.Queue('outbound-messages', {
        connection,
        defaultJobOptions: buildOptions(queues.outboundMessages),
    });
    const mediaDownloadQueue = new bullmq_1.Queue('media-download', {
        connection,
        defaultJobOptions: buildOptions(queues.mediaDownload),
    });
    const deadLetterQueue = new bullmq_1.Queue('dead-letter', {
        connection,
        defaultJobOptions: buildOptions(queues.deadLetter),
    });
    const campaignSchedulerQueue = new bullmq_1.Queue('campaign-scheduler', {
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
