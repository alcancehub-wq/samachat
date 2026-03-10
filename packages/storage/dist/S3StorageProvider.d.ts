import type { StorageMetadata, StorageProvider, StorageSaveResult } from './StorageProvider';
export declare class S3StorageProvider implements StorageProvider {
    saveFile(_buffer: Buffer, metadata?: StorageMetadata): Promise<StorageSaveResult>;
    getFileUrl(id: string): Promise<string>;
}
//# sourceMappingURL=S3StorageProvider.d.ts.map