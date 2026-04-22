"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WabaProvider = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ service: 'messaging', provider: 'waba' });
class WabaProvider {
    async sendMessage(input) {
        const messageId = (0, crypto_1.randomUUID)();
        logger.info({ messageId, to: input.to }, 'WABA provider stub send');
        return {
            messageId,
            status: 'queued',
            provider: 'waba',
            raw: { stub: true },
        };
    }
    async handleWebhook(payload) {
        logger.info({ payload }, 'WABA provider webhook received');
    }
    async getMessageStatus(messageId) {
        logger.info({ messageId }, 'WABA provider status requested');
        return 'sent';
    }
}
exports.WabaProvider = WabaProvider;
