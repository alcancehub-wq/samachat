"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const promises_1 = require("fs/promises");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const logger = (0, logger_1.getLogger)({ storage: 'local' });
class LocalStorageProvider {
    basePath;
    constructor() {
        const { storageLocalPath } = (0, config_1.getConfig)();
        this.basePath = path_1.default.resolve(storageLocalPath);
    }
    async saveFile(buffer, metadata) {
        await (0, promises_1.mkdir)(this.basePath, { recursive: true });
        const extension = metadata?.extension ? `.${metadata.extension.replace(/^\./, '')}` : '';
        const id = (0, crypto_1.randomUUID)();
        const filename = `${id}${extension}`;
        const filePath = path_1.default.join(this.basePath, filename);
        await (0, promises_1.writeFile)(filePath, buffer);
        logger.info({ id, filePath }, 'Local file saved');
        return {
            id,
            url: (0, url_1.pathToFileURL)(filePath).toString(),
            storageKey: filename,
            provider: 'local',
            metadata,
        };
    }
    async getFileUrl(id) {
        const filePath = path_1.default.join(this.basePath, id);
        return (0, url_1.pathToFileURL)(filePath).toString();
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
