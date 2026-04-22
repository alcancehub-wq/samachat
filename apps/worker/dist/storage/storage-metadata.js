"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistStorageMetadata = persistStorageMetadata;
const db_1 = require("@samachat/db");
const prisma = new db_1.PrismaClient();
async function persistStorageMetadata(result, metadata) {
    await prisma.storageAsset.create({
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
