import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { getConfig } from '@samachat/config';
import { createStorageProvider, type StorageMetadata, type StorageSaveResult } from '@samachat/storage';
import { PrismaService } from '../common/prisma/prisma.service';

interface SaveMediaResult {
  publicUrl: string;
  internalUrl: string;
  storageKey: string;
  provider: string;
  metadata?: StorageMetadata;
}

@Injectable()
export class StorageService {
  private readonly provider = createStorageProvider();
  private readonly localBasePath: string;

  constructor(private readonly prisma: PrismaService) {
    const { storageLocalPath } = getConfig();
    this.localBasePath = path.resolve(storageLocalPath);
  }

  async saveMedia(buffer: Buffer, metadata?: StorageMetadata): Promise<SaveMediaResult> {
    const result = await this.provider.saveFile(buffer, metadata);
    await this.persistMetadata(result, metadata);

    const publicUrl =
      result.provider === 'local' ? `/media/${result.storageKey}` : result.url;

    return {
      publicUrl,
      internalUrl: result.url,
      storageKey: result.storageKey,
      provider: result.provider,
      metadata,
    };
  }

  async resolveLocalPath(storageKey: string): Promise<string> {
    const asset = await this.prisma.storageAsset.findFirst({
      where: {
        provider: 'local',
        storage_key: storageKey,
      },
    });

    if (!asset) {
      throw new NotFoundException('Media not found');
    }

    const filePath = path.join(this.localBasePath, storageKey);
    await stat(filePath);
    return filePath;
  }

  async getAssetByKey(storageKey: string): Promise<StorageSaveResult | null> {
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

  createLocalStream(storageKey: string) {
    return createReadStream(path.join(this.localBasePath, storageKey));
  }

  private async persistMetadata(result: StorageSaveResult, metadata?: StorageMetadata) {
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
}
