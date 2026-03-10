import { getLogger } from '@samachat/logger';
import type { StorageMetadata, StorageProvider, StorageSaveResult } from './StorageProvider';

const logger = getLogger({ storage: 's3' });

export class S3StorageProvider implements StorageProvider {
  async saveFile(_buffer: Buffer, metadata?: StorageMetadata): Promise<StorageSaveResult> {
    logger.info({ metadata }, 'S3 storage stub save');
    return {
      id: 's3-stub',
      url: 's3://stub',
      storageKey: 's3-stub',
      provider: 's3',
      metadata,
    };
  }

  async getFileUrl(id: string): Promise<string> {
    logger.info({ id }, 'S3 storage stub get url');
    return `s3://stub/${id}`;
  }
}
