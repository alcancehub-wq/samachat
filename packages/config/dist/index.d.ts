export type ProviderMode = 'qr' | 'waba' | 'hybrid';
export type StorageMode = 'local' | 's3';
export interface QueueConfig {
    attempts: number;
    backoffMs: number;
    timeoutMs: number;
}
export interface WebhookConfig {
    maxPayloadBytes: number;
    allowedContentTypes: string[];
    idempotencyTtlSeconds: number;
    qrSecret?: string;
}
export interface QueueSettings {
    inboundEvents: QueueConfig;
    outboundMessages: QueueConfig;
    mediaDownload: QueueConfig;
    deadLetter: QueueConfig;
}
export interface QueueBackpressureConfig {
    threshold: number;
    delayMs: number;
    warningCooldownMs: number;
}
export interface ProviderPoolConfig {
    defaultSize: number;
    sizes: Record<string, number>;
}
export interface AppConfig {
    appVersion: string;
    providerMode: ProviderMode;
    redisUrl?: string;
    storageMode: StorageMode;
    storageLocalPath: string;
    ports: {
        api: number;
    };
    legal: {
        termsVersion: string;
        privacyVersion: string;
    };
    waba: {
        verifyToken?: string;
        appSecret?: string;
    };
    supabase: {
        url?: string;
        serviceRoleKey?: string;
        jwtSecret?: string;
    };
    logging: {
        level: string;
    };
    retry: {
        maxAttempts: number;
        delayMs: number;
    };
    webhook: WebhookConfig;
    queues: QueueSettings;
    queueBackpressure: QueueBackpressureConfig;
    queueLockTtlMs: number;
    providerPool: ProviderPoolConfig;
}
export declare const config: AppConfig;
export declare function getConfig(): AppConfig;
export declare function requireRedisUrl(): string;
//# sourceMappingURL=index.d.ts.map