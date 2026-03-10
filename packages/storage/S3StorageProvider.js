"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageProvider = void 0;
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ storage: 's3' });
class S3StorageProvider {
    async saveFile(_buffer, metadata) {
        logger.info({ metadata }, 'S3 storage stub save');
        return {
            id: 's3-stub',
            url: 's3://stub',
            storageKey: 's3-stub',
            provider: 's3',
            metadata,
        };
    }
    async getFileUrl(id) {
        logger.info({ id }, 'S3 storage stub get url');
        return `s3://stub/${id}`;
    }
}
exports.S3StorageProvider = S3StorageProvider;
