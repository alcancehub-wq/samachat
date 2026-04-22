export type MessagingProviderName = 'qr' | 'waba';
export interface SendMessageInput {
    to: string;
    body: string;
    mediaUrl?: string;
    metadata?: Record<string, unknown>;
}
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export interface MessageResult {
    messageId: string;
    status: MessageStatus;
    provider: MessagingProviderName;
    raw?: Record<string, unknown>;
}
export interface WebhookEvent {
    eventId: string;
    provider: MessagingProviderName;
    type: string;
    payload: unknown;
    receivedAt: string;
    requestId?: string;
    correlationId?: string;
    tenantId?: string;
}
export interface NormalizedWebhookEvent extends WebhookEvent {
    rawPayload?: unknown;
    normalizedPayload?: Record<string, unknown>;
    contactId?: string;
}
//# sourceMappingURL=types.d.ts.map