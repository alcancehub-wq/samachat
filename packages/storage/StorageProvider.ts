export interface StorageMetadata {
  filename?: string;
  contentType?: string;
  extension?: string;
  sizeBytes?: number;
}

export interface StorageSaveResult {
  id: string;
  url: string;
  storageKey: string;
  provider: string;
  metadata?: StorageMetadata;
}

export interface StorageProvider {
  saveFile(buffer: Buffer, metadata?: StorageMetadata): Promise<StorageSaveResult>;
  getFileUrl(id: string): Promise<string>;
}
