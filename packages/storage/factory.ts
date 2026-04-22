import { getConfig } from '@samachat/config';
import type { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { S3StorageProvider } from './S3StorageProvider';

export function createStorageProvider(): StorageProvider {
  const { storageMode } = getConfig();
  if (storageMode === 's3') {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}
