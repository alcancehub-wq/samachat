"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageProvider = exports.S3StorageProvider = exports.LocalStorageProvider = void 0;
var LocalStorageProvider_1 = require("./LocalStorageProvider");
Object.defineProperty(exports, "LocalStorageProvider", { enumerable: true, get: function () { return LocalStorageProvider_1.LocalStorageProvider; } });
var S3StorageProvider_1 = require("./S3StorageProvider");
Object.defineProperty(exports, "S3StorageProvider", { enumerable: true, get: function () { return S3StorageProvider_1.S3StorageProvider; } });
var factory_1 = require("./factory");
Object.defineProperty(exports, "createStorageProvider", { enumerable: true, get: function () { return factory_1.createStorageProvider; } });
