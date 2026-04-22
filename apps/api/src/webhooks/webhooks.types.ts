import type { NormalizedWebhookEvent } from '@samachat/messaging';

export interface InboundJobPayload {
  event: NormalizedWebhookEvent;
  requestId: string;
  correlationId: string;
  trace?: Record<string, string>;
}
