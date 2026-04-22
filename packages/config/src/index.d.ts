export type ProviderMode = 'qr' | 'waba' | 'hybrid';
export type StorageMode = 'local' | 's3';
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
    alerts: {
        webhookUrl?: string;
        messageFailureThreshold: number;
        messageFailureWindowSeconds: number;
    };
}
export declare const config: AppConfig;
export declare function getConfig(): AppConfig;
export declare function requireRedisUrl(): string;
//# sourceMappingURL=index.d.ts.map