import { createHash, createHmac } from 'crypto';
import type { NormalizedWebhookEvent } from '../../core/types';
import type {
  NormalizeWebhookOptions,
  NormalizeWebhookResult,
  VerifyWebhookSignatureInput,
  VerifyWebhookSignatureResult,
} from '../../core/webhook';

function extractQrEventId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const value = (payload as { eventId?: unknown }).eventId;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

function buildNormalizedPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const record = payload as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  if (typeof record.to === 'string') {
    normalized.to = record.to;
  }
  if (typeof record.body === 'string') {
    normalized.body = record.body;
  }
  if (typeof record.mediaUrl === 'string') {
    normalized.mediaUrl = record.mediaUrl;
  }
  return normalized;
}

export function normalizeQrWebhookEvent(
  payload: unknown,
  options: NormalizeWebhookOptions,
): NormalizeWebhookResult {
  const receivedAt = options.receivedAt || new Date().toISOString();
  const eventId = options.eventIdOverride || extractQrEventId(payload) || buildFallbackEventId(payload);

  const event: NormalizedWebhookEvent = {
    eventId,
    provider: 'qr',
    type: 'webhook',
    payload,
    rawPayload: payload,
    normalizedPayload: buildNormalizedPayload(payload),
    receivedAt,
    requestId: options.requestId,
    correlationId: options.correlationId,
    tenantId: options.tenantId,
  };

  return { ok: true, event };
}

export function verifyQrSignature(
  input: VerifyWebhookSignatureInput,
): VerifyWebhookSignatureResult {
  if (!input.signature) {
    return { valid: false, status: 'missing-signature' };
  }
  if (!input.secret) {
    return { valid: false, status: 'missing-secret' };
  }
  const expected = createHmac('sha256', input.secret).update(input.rawBody).digest('hex');
  const valid = timingSafeCompare(expected, input.signature);
  return { valid, status: valid ? 'ok' : 'invalid-signature' };
}

function buildFallbackEventId(payload: unknown): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return createHash('sha256').update(serialized).digest('hex');
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
