import { createHash } from 'crypto';
import type IORedis from 'ioredis';
import type { MessagingProviderName, NormalizedWebhookEvent } from '@samachat/messaging';

export function buildIdempotencyKey(event: NormalizedWebhookEvent): string {
  return `webhook:${event.provider}:${event.eventId}`;
}

export function buildReplayProtectionKey(
  provider: MessagingProviderName,
  fingerprint: string,
): string {
  return `webhook-replay:${provider}:${fingerprint}`;
}

export function computeReplayFingerprint(
  provider: MessagingProviderName,
  rawBody: string,
  timestampMs: number,
  signature?: string,
): string {
  const hash = createHash('sha256');
  hash.update(provider);
  hash.update('|');
  hash.update(String(timestampMs));
  hash.update('|');
  hash.update(signature || '');
  hash.update('|');
  hash.update(rawBody);
  return hash.digest('hex');
}

export async function checkAndSetIdempotency(
  redis: IORedis,
  event: NormalizedWebhookEvent,
  requestId: string,
  ttlSeconds: number,
): Promise<boolean> {
  const key = buildIdempotencyKey(event);
  const result = await redis.set(key, requestId, 'EX', ttlSeconds, 'NX');
  return Boolean(result);
}

export async function checkAndSetReplayProtection(
  redis: IORedis,
  provider: MessagingProviderName,
  rawBody: string,
  timestampMs: number,
  signature: string | undefined,
  ttlSeconds: number,
): Promise<boolean> {
  const fingerprint = computeReplayFingerprint(provider, rawBody, timestampMs, signature);
  const key = buildReplayProtectionKey(provider, fingerprint);
  const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
  return Boolean(result);
}
