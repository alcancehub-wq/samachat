import { createHash } from 'crypto';
import type { MessagingProviderName, NormalizedWebhookEvent } from './types';
import { normalizeQrWebhookEvent, verifyQrSignature } from '../providers/qr/webhook';
import { normalizeWabaWebhookEvent, verifyWabaSignature } from '../providers/waba/webhook';

export interface NormalizeWebhookOptions {
  receivedAt?: string;
  requestId?: string;
  correlationId?: string;
  eventIdOverride?: string;
  tenantId?: string;
}

export interface NormalizeWebhookResult {
  ok: boolean;
  event?: NormalizedWebhookEvent;
  error?: string;
}

export interface VerifyWebhookSignatureInput {
  provider: MessagingProviderName;
  rawBody: string;
  signature?: string;
  secret?: string;
}

export type VerifyWebhookStatus =
  | 'ok'
  | 'missing-signature'
  | 'missing-secret'
  | 'invalid-signature'
  | 'unsupported';

export interface VerifyWebhookSignatureResult {
  valid: boolean;
  status: VerifyWebhookStatus;
}

export function normalizeWebhookEvent(
  provider: MessagingProviderName,
  payload: unknown,
  options: NormalizeWebhookOptions = {},
): NormalizeWebhookResult {
  if (provider === 'waba') {
    return normalizeWabaWebhookEvent(payload, options);
  }
  if (provider === 'qr') {
    return normalizeQrWebhookEvent(payload, options);
  }
  return { ok: false, error: 'unsupported-provider' };
}

export function verifyWebhookSignature(
  input: VerifyWebhookSignatureInput,
): VerifyWebhookSignatureResult {
  if (input.provider === 'waba') {
    return verifyWabaSignature(input);
  }
  if (input.provider === 'qr') {
    return verifyQrSignature(input);
  }
  return { valid: false, status: 'unsupported' };
}

export function buildFallbackEventId(payload: unknown): string {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  return createHash('sha256').update(serialized).digest('hex');
}
