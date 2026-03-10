import { PrismaClient } from '@samachat/db';
import type { StorageSaveResult, StorageMetadata } from '@samachat/storage';

const prisma = new PrismaClient();

export async function persistStorageMetadata(
  result: StorageSaveResult,
  metadata?: StorageMetadata,
): Promise<void> {
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
