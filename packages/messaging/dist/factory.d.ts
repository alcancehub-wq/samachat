import type { MessagingProvider } from './core/MessagingProvider';
import type { MessagingProviderName, WebhookEvent } from './core/types';
export declare function getProviderByName(name: MessagingProviderName): MessagingProvider;
export declare function resolveProviderName(event?: WebhookEvent): MessagingProviderName;
export declare function getProviderForEvent(event?: WebhookEvent): MessagingProvider;
//# sourceMappingURL=factory.d.ts.map