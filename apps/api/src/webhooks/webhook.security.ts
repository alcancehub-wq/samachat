import { UnauthorizedException } from '@nestjs/common';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
const TIMESTAMP_HEADERS = [
  'x-webhook-timestamp',
  'x-timestamp',
  'x-request-timestamp',
  'x-hub-timestamp',
];

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseWebhookTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return trimmed.length === 10 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

export function getWebhookTimestampHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  for (const header of TIMESTAMP_HEADERS) {
    const value = getHeaderValue(headers, header);
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function assertFreshWebhookTimestamp(
  headerValue: string | undefined,
  nowMs = Date.now(),
): number {
  if (!headerValue) {
    throw new UnauthorizedException('Missing webhook timestamp');
  }

  const parsed = parseWebhookTimestamp(headerValue);
  if (parsed === null) {
    throw new UnauthorizedException('Invalid webhook timestamp');
  }

  if (Math.abs(nowMs - parsed) > MAX_WEBHOOK_AGE_MS) {
    throw new UnauthorizedException('Stale webhook');
  }

  return parsed;
}
