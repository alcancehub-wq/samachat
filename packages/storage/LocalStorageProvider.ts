import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';
import { pathToFileURL } from 'url';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import type { StorageMetadata, StorageProvider, StorageSaveResult } from './StorageProvider';

const logger = getLogger({ storage: 'local' });

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor() {
    const { storageLocalPath } = getConfig();
    this.basePath = path.resolve(storageLocalPath);
  }

  async saveFile(buffer: Buffer, metadata?: StorageMetadata): Promise<StorageSaveResult> {
    await mkdir(this.basePath, { recursive: true });

    const extension = metadata?.extension ? `.${metadata.extension.replace(/^\./, '')}` : '';
    const id = randomUUID();
    const filename = `${id}${extension}`;
    const filePath = path.join(this.basePath, filename);

    await writeFile(filePath, buffer);
    logger.info({ id, filePath }, 'Local file saved');

    return {
      id,
      url: pathToFileURL(filePath).toString(),
      storageKey: filename,
      provider: 'local',
      metadata,
    };
  }

  async getFileUrl(id: string): Promise<string> {
    const filePath = path.join(this.basePath, id);
    return pathToFileURL(filePath).toString();
  }
}
