import { createHash, createHmac } from 'crypto';
import type { NormalizedWebhookEvent } from '../../core/types';
import type {
  NormalizeWebhookOptions,
  NormalizeWebhookResult,
  VerifyWebhookSignatureInput,
  VerifyWebhookSignatureResult,
} from '../../core/webhook';

function extractWabaValue(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const entry = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entry) || entry.length === 0) {
    return undefined;
  }
  const firstEntry = entry[0] as { changes?: unknown };
  const changes = firstEntry?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return undefined;
  }
  const firstChange = changes[0] as { value?: unknown };
  if (!firstChange?.value || typeof firstChange.value !== 'object') {
    return undefined;
  }
  return firstChange.value as Record<string, unknown>;
}

function extractMessageId(value?: Record<string, unknown>): string | undefined {
  const messages = value?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const message = messages[0] as Record<string, unknown>;
    if (typeof message.id === 'string') {
      return message.id;
    }
  }
  const statuses = value?.statuses;
  if (Array.isArray(statuses) && statuses.length > 0) {
    const status = statuses[0] as Record<string, unknown>;
    if (typeof status.id === 'string') {
      return status.id;
    }
  }
  return undefined;
}

function extractContactId(value?: Record<string, unknown>): string | undefined {
  const contacts = value?.contacts;
  if (Array.isArray(contacts) && contacts.length > 0) {
    const contact = contacts[0] as Record<string, unknown>;
    if (typeof contact.wa_id === 'string') {
      return contact.wa_id;
    }
  }
  return undefined;
}

function buildNormalizedPayload(value?: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const messages = value?.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const message = messages[0] as Record<string, unknown>;
    if (typeof message.from === 'string') {
      payload.to = message.from;
    }
    const text = (message.text as { body?: unknown } | undefined)?.body;
    if (typeof text === 'string') {
      payload.body = text;
    }
    const media = message.image || message.video || message.audio || message.document;
    if (media && typeof media === 'object' && typeof (media as { link?: unknown }).link === 'string') {
      payload.mediaUrl = (media as { link: string }).link;
    }
  }
  return payload;
}

export function normalizeWabaWebhookEvent(
  payload: unknown,
  options: NormalizeWebhookOptions,
): NormalizeWebhookResult {
  const receivedAt = options.receivedAt || new Date().toISOString();
  const value = extractWabaValue(payload);
  const eventId = options.eventIdOverride || extractMessageId(value) || buildFallbackEventId(payload);
  const normalizedPayload = buildNormalizedPayload(value);

  const event: NormalizedWebhookEvent = {
    eventId,
    provider: 'waba',
    type: 'webhook',
    payload,
    rawPayload: payload,
    normalizedPayload,
    receivedAt,
    requestId: options.requestId,
    correlationId: options.correlationId,
    tenantId: options.tenantId,
    contactId: extractContactId(value),
  };

  return { ok: true, event };
}

export function verifyWabaSignature(
  input: VerifyWebhookSignatureInput,
): VerifyWebhookSignatureResult {
  if (!input.signature) {
    return { valid: false, status: 'missing-signature' };
  }
  if (!input.secret) {
    return { valid: false, status: 'missing-secret' };
  }
  const expected = `sha256=${createHmac('sha256', input.secret).update(input.rawBody).digest('hex')}`;
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
