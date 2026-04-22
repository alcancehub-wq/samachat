"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageProvider = createStorageProvider;
const config_1 = require("@samachat/config");
const LocalStorageProvider_1 = require("./LocalStorageProvider");
const S3StorageProvider_1 = require("./S3StorageProvider");
function createStorageProvider() {
    const { storageMode } = (0, config_1.getConfig)();
    if (storageMode === 's3') {
        return new S3StorageProvider_1.S3StorageProvider();
    }
    return new LocalStorageProvider_1.LocalStorageProvider();
}
