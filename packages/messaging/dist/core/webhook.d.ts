import type { MessagingProviderName, NormalizedWebhookEvent } from './types';
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
export type VerifyWebhookStatus = 'ok' | 'missing-signature' | 'missing-secret' | 'invalid-signature' | 'unsupported';
export interface VerifyWebhookSignatureResult {
    valid: boolean;
    status: VerifyWebhookStatus;
}
export declare function normalizeWebhookEvent(provider: MessagingProviderName, payload: unknown, options?: NormalizeWebhookOptions): NormalizeWebhookResult;
export declare function verifyWebhookSignature(input: VerifyWebhookSignatureInput): VerifyWebhookSignatureResult;
export declare function buildFallbackEventId(payload: unknown): string;
//# sourceMappingURL=webhook.d.ts.map