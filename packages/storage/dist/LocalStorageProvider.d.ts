import type { StorageMetadata, StorageProvider, StorageSaveResult } from './StorageProvider';
export declare class LocalStorageProvider implements StorageProvider {
    private readonly basePath;
    constructor();
    saveFile(buffer: Buffer, metadata?: StorageMetadata): Promise<StorageSaveResult>;
    getFileUrl(id: string): Promise<string>;
}
//# sourceMappingURL=LocalStorageProvider.d.ts.map