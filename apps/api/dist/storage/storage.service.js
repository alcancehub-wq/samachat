"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const config_1 = require("@samachat/config");
const storage_1 = require("@samachat/storage");
const prisma_service_1 = require("../common/prisma/prisma.service");
let StorageService = class StorageService {
    prisma;
    provider = (0, storage_1.createStorageProvider)();
    localBasePath;
    constructor(prisma) {
        this.prisma = prisma;
        const { storageLocalPath } = (0, config_1.getConfig)();
        this.localBasePath = path_1.default.resolve(storageLocalPath);
    }
    async saveMedia(buffer, metadata) {
        const result = await this.provider.saveFile(buffer, metadata);
        await this.persistMetadata(result, metadata);
        const publicUrl = result.provider === 'local' ? `/media/${result.storageKey}` : result.url;
        return {
            publicUrl,
            internalUrl: result.url,
            storageKey: result.storageKey,
            provider: result.provider,
            metadata,
        };
    }
    async resolveLocalPath(storageKey) {
        const asset = await this.prisma.storageAsset.findFirst({
            where: {
                provider: 'local',
                storage_key: storageKey,
            },
        });
        if (!asset) {
            throw new common_1.NotFoundException('Media not found');
        }
        const filePath = path_1.default.join(this.localBasePath, storageKey);
        await (0, promises_1.stat)(filePath);
        return filePath;
    }
    async getAssetByKey(storageKey) {
        const asset = await this.prisma.storageAsset.findFirst({
            where: { storage_key: storageKey },
        });
        if (!asset) {
            return null;
        }
        return {
            id: asset.id,
            url: asset.url,
            storageKey: asset.storage_key,
            provider: asset.provider,
            metadata: {
                filename: asset.filename ?? undefined,
                contentType: asset.content_type ?? undefined,
                sizeBytes: asset.size_bytes ?? undefined,
            },
        };
    }
    createLocalStream(storageKey) {
        return (0, fs_1.createReadStream)(path_1.default.join(this.localBasePath, storageKey));
    }
    async persistMetadata(result, metadata) {
        await this.prisma.storageAsset.create({
            data: {
                provider: result.provider,
                storage_key: result.storageKey,
                url: result.url,
                filename: metadata?.filename,
                content_type: metadata?.contentType,
                size_bytes: metadata?.sizeBytes ?? null,
            },
        });
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StorageService);
