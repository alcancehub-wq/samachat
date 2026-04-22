import { z } from 'zod';
import type { MessagingProviderName } from '@samachat/messaging';

export interface WebhookValidationResult {
  ok: boolean;
  error?: string;
}

export const webhookBaseSchema = z.object({}).passthrough();
export const wabaWebhookSchema = z
  .object({
    entry: z.array(z.unknown()).min(1),
  })
  .passthrough();

function getWebhookSchema(provider: MessagingProviderName) {
  return provider === 'waba' ? wabaWebhookSchema : webhookBaseSchema;
}

export function validateWebhookPayload(
  provider: MessagingProviderName,
  payload: unknown,
): WebhookValidationResult {
  const schema = getWebhookSchema(provider);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: 'invalid-payload' };
  }

  return { ok: true };
}
