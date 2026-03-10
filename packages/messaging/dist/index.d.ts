export type { MessagingProvider } from './core/MessagingProvider';
export type { MessageResult, MessageStatus, MessagingProviderName, SendMessageInput, NormalizedWebhookEvent, WebhookEvent, } from './core/types';
export { MessagingError } from './core/errors';
export { getProviderByName, getProviderForEvent, resolveProviderName } from './factory';
export { normalizeWebhookEvent, verifyWebhookSignature } from './core/webhook';
//# sourceMappingURL=index.d.ts.map