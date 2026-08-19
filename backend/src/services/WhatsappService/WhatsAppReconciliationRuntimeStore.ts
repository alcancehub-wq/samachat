import { randomBytes } from "crypto";

import { getRedisClient } from "../../libs/redisStore";

export const WHATSAPP_RECONCILIATION_LOCK_TTL_MS = 60 * 1000;
export const WHATSAPP_RECONCILIATION_LOCK_HEARTBEAT_MS = 20 * 1000;
export const MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS = 15 * 60 * 1000;

const LOCK_PREFIX = "samachat:whatsapp-reconciliation:lock";
const COOLDOWN_PREFIX = "samachat:whatsapp-reconciliation:manual-cooldown";

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const RENEW_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

const normalizeWhatsappId = (whatsappId: number): number => {
  const normalized = Number(whatsappId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }

  return normalized;
};

const getReadyRedisClient = () => {
  const client = getRedisClient();

  if (!client || client.status !== "ready") {
    throw new Error("ERR_WHATSAPP_RECONCILIATION_RUNTIME_UNAVAILABLE");
  }

  return client;
};

const buildLockKey = (whatsappId: number): string =>
  `${LOCK_PREFIX}:${normalizeWhatsappId(whatsappId)}`;

const buildCooldownKey = (whatsappId: number): string =>
  `${COOLDOWN_PREFIX}:${normalizeWhatsappId(whatsappId)}`;

export interface WhatsAppReconciliationDistributedLock {
  whatsappId: number;
  token: string;
}

export const acquireWhatsAppReconciliationLock = async (
  whatsappId: number
): Promise<WhatsAppReconciliationDistributedLock | null> => {
  const normalizedWhatsappId = normalizeWhatsappId(whatsappId);
  const client = getReadyRedisClient();
  const token = randomBytes(24).toString("hex");

  const result = await client.set(
    buildLockKey(normalizedWhatsappId),
    token,
    "PX",
    WHATSAPP_RECONCILIATION_LOCK_TTL_MS,
    "NX"
  );

  if (result !== "OK") {
    return null;
  }

  return {
    whatsappId: normalizedWhatsappId,
    token
  };
};

export const renewWhatsAppReconciliationLock = async (
  lock: WhatsAppReconciliationDistributedLock
): Promise<boolean> => {
  const client = getReadyRedisClient();

  const result = await client.eval(
    RENEW_LOCK_SCRIPT,
    1,
    buildLockKey(lock.whatsappId),
    lock.token,
    String(WHATSAPP_RECONCILIATION_LOCK_TTL_MS)
  );

  return Number(result) === 1;
};

export const releaseWhatsAppReconciliationLock = async (
  lock: WhatsAppReconciliationDistributedLock
): Promise<void> => {
  const client = getReadyRedisClient();

  await client.eval(
    RELEASE_LOCK_SCRIPT,
    1,
    buildLockKey(lock.whatsappId),
    lock.token
  );
};

export const getWhatsAppReconciliationLockRetryAfterMs = async (
  whatsappId: number
): Promise<number> => {
  const client = getReadyRedisClient();

  const ttl = await client.pttl(buildLockKey(whatsappId));

  return ttl > 0 ? ttl : 0;
};

export const getManualWhatsAppResyncRetryAfterMs = async (
  whatsappId: number
): Promise<number> => {
  const client = getReadyRedisClient();

  const ttl = await client.pttl(buildCooldownKey(whatsappId));

  return ttl > 0 ? ttl : 0;
};

export const startManualWhatsAppResyncCooldown = async (
  whatsappId: number
): Promise<void> => {
  const client = getReadyRedisClient();

  await client.set(
    buildCooldownKey(whatsappId),
    "1",
    "PX",
    MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS
  );
};
