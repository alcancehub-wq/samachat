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
  alerts: {
    webhookUrl?: string;
    messageFailureThreshold: number;
    messageFailureWindowSeconds: number;
  };
  uploads: {
    maxUploadMb: number;
  };
}

const DEFAULTS = {
  appVersion: '0.1.0',
  providerMode: 'qr' as ProviderMode,
  storageMode: 'local' as StorageMode,
  storageLocalPath: 'storage',
  apiPort: 3001,
  logLevel: 'info',
  retryMaxAttempts: 3,
  retryDelayMs: 1000,
  termsVersion: '2026-02-22',
  privacyVersion: '2026-02-22',
  webhookMaxPayloadBytes: 1024 * 1024,
  webhookAllowedContentTypes: ['application/json'],
  webhookIdempotencyTtlSeconds: 60 * 60,
  queueAttempts: 5,
  queueBackoffMs: 2000,
  queueTimeoutMs: 30000,
  queueDlqTimeoutMs: 30000,
  queueBackpressureThreshold: 2000,
  queueBackpressureDelayMs: 250,
  queueBackpressureWarningCooldownMs: 30000,
  queueLockTtlMs: 120000,
  providerPoolSize: 1,
  alertMessageFailureThreshold: 5,
  alertMessageFailureWindowSeconds: 300,
  uploadMaxMb: 20,
};

const REQUEST_MAX_BYTES = 1024 * 1024;

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  return value;
}

function getNumberEnv(key: string, fallback: number): number {
  const raw = getEnv(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getListEnv(key: string, fallback: string[]): string[] {
  const raw = getEnv(key);
  if (!raw) {
    return fallback;
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export const config: AppConfig = {
  appVersion: getEnv('npm_package_version') || DEFAULTS.appVersion,
  providerMode: (getEnv('PROVIDER_MODE') as ProviderMode) || DEFAULTS.providerMode,
  redisUrl: getEnv('REDIS_URL'),
  storageMode: (getEnv('STORAGE_MODE') as StorageMode) || DEFAULTS.storageMode,
  storageLocalPath: getEnv('LOCAL_STORAGE_PATH') || DEFAULTS.storageLocalPath,
  ports: {
    api: getNumberEnv('PORT', DEFAULTS.apiPort),
  },
  legal: {
    termsVersion: getEnv('TERMS_VERSION') || DEFAULTS.termsVersion,
    privacyVersion: getEnv('PRIVACY_VERSION') || DEFAULTS.privacyVersion,
  },
  waba: {
    verifyToken: getEnv('WABA_VERIFY_TOKEN'),
    appSecret: getEnv('WABA_APP_SECRET'),
  },
  supabase: {
    url: getEnv('SUPABASE_URL'),
    serviceRoleKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    jwtSecret: getEnv('SUPABASE_JWT_SECRET'),
  },
  logging: {
    level: getEnv('LOG_LEVEL') || DEFAULTS.logLevel,
  },
  retry: {
    maxAttempts: getNumberEnv('RETRY_MAX_ATTEMPTS', DEFAULTS.retryMaxAttempts),
    delayMs: getNumberEnv('RETRY_DELAY_MS', DEFAULTS.retryDelayMs),
  },
  webhook: {
    maxPayloadBytes: Math.min(
      getNumberEnv('WEBHOOK_MAX_PAYLOAD_BYTES', DEFAULTS.webhookMaxPayloadBytes),
      REQUEST_MAX_BYTES,
    ),
    allowedContentTypes: getListEnv(
      'WEBHOOK_ALLOWED_CONTENT_TYPES',
      DEFAULTS.webhookAllowedContentTypes,
    ),
    idempotencyTtlSeconds: getNumberEnv(
      'WEBHOOK_IDEMPOTENCY_TTL_SECONDS',
      DEFAULTS.webhookIdempotencyTtlSeconds,
    ),
    qrSecret: getEnv('WEBHOOK_QR_SECRET'),
  },
  queues: {
    inboundEvents: {
      attempts: getNumberEnv('QUEUE_INBOUND_ATTEMPTS', DEFAULTS.queueAttempts),
      backoffMs: getNumberEnv('QUEUE_INBOUND_BACKOFF_MS', DEFAULTS.queueBackoffMs),
      timeoutMs: getNumberEnv('QUEUE_INBOUND_TIMEOUT_MS', DEFAULTS.queueTimeoutMs),
    },
    outboundMessages: {
      attempts: getNumberEnv('QUEUE_OUTBOUND_ATTEMPTS', DEFAULTS.queueAttempts),
      backoffMs: getNumberEnv('QUEUE_OUTBOUND_BACKOFF_MS', DEFAULTS.queueBackoffMs),
      timeoutMs: getNumberEnv('QUEUE_OUTBOUND_TIMEOUT_MS', DEFAULTS.queueTimeoutMs),
    },
    mediaDownload: {
      attempts: getNumberEnv('QUEUE_MEDIA_ATTEMPTS', DEFAULTS.queueAttempts),
      backoffMs: getNumberEnv('QUEUE_MEDIA_BACKOFF_MS', DEFAULTS.queueBackoffMs),
      timeoutMs: getNumberEnv('QUEUE_MEDIA_TIMEOUT_MS', DEFAULTS.queueTimeoutMs),
    },
    deadLetter: {
      attempts: 1,
      backoffMs: 0,
      timeoutMs: getNumberEnv('QUEUE_DLQ_TIMEOUT_MS', DEFAULTS.queueDlqTimeoutMs),
    },
  },
  queueBackpressure: {
    threshold: getNumberEnv(
      'QUEUE_BACKPRESSURE_THRESHOLD',
      DEFAULTS.queueBackpressureThreshold,
    ),
    delayMs: getNumberEnv('QUEUE_BACKPRESSURE_DELAY_MS', DEFAULTS.queueBackpressureDelayMs),
    warningCooldownMs: getNumberEnv(
      'QUEUE_BACKPRESSURE_WARNING_COOLDOWN_MS',
      DEFAULTS.queueBackpressureWarningCooldownMs,
    ),
  },
  queueLockTtlMs: getNumberEnv('QUEUE_LOCK_TTL_MS', DEFAULTS.queueLockTtlMs),
  providerPool: {
    defaultSize: getNumberEnv('PROVIDER_POOL_SIZE', DEFAULTS.providerPoolSize),
    sizes: {
      qr: getNumberEnv('PROVIDER_POOL_QR_SIZE', DEFAULTS.providerPoolSize),
      waba: getNumberEnv('PROVIDER_POOL_WABA_SIZE', DEFAULTS.providerPoolSize),
    },
  },
  alerts: {
    webhookUrl: getEnv('ALERT_WEBHOOK_URL'),
    messageFailureThreshold: getNumberEnv(
      'ALERT_MESSAGE_FAILURE_THRESHOLD',
      DEFAULTS.alertMessageFailureThreshold,
    ),
    messageFailureWindowSeconds: getNumberEnv(
      'ALERT_MESSAGE_FAILURE_WINDOW_SECONDS',
      DEFAULTS.alertMessageFailureWindowSeconds,
    ),
  },
  uploads: {
    maxUploadMb: getNumberEnv('MAX_UPLOAD_MB', DEFAULTS.uploadMaxMb),
  },
};

export function getConfig(): AppConfig {
  return config;
}

export function requireRedisUrl(): string {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is not configured');
  }
  return config.redisUrl;
}
