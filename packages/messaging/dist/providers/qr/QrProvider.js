"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrProvider = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ service: 'messaging', provider: 'qr' });
class QrProvider {
    async sendMessage(input) {
        const messageId = (0, crypto_1.randomUUID)();
        logger.info({ messageId, to: input.to }, 'QR provider stub send');
        return {
            messageId,
            status: 'queued',
            provider: 'qr',
            raw: { stub: true },
        };
    }
    async handleWebhook(payload) {
        logger.info({ payload }, 'QR provider webhook received');
    }
    async getMessageStatus(messageId) {
        logger.info({ messageId }, 'QR provider status requested');
        return 'sent';
    }
}
exports.QrProvider = QrProvider;
