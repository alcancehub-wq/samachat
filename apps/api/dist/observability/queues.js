"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_NAMES = void 0;
exports.createQueueClients = createQueueClients;
const bullmq_1 = require("bullmq");
exports.QUEUE_NAMES = [
    'inbound-events',
    'outbound-messages',
    'media-download',
    'dead-letter',
    'campaign-scheduler',
];
function createQueueClients(connection) {
    return exports.QUEUE_NAMES.map((queueName) => new bullmq_1.Queue(queueName, { connection }));
}
