import { getConfig } from '@samachat/config';
import type { MessagingProvider } from './core/MessagingProvider';
import type { MessagingProviderName, WebhookEvent } from './core/types';
import { QrProvider } from './providers/qr/QrProvider';
import { WabaProvider } from './providers/waba/WabaProvider';

const providers: Record<MessagingProviderName, MessagingProvider> = {
  qr: new QrProvider(),
  waba: new WabaProvider(),
};

export function getProviderByName(name: MessagingProviderName): MessagingProvider {
  return providers[name];
}

export function resolveProviderName(event?: WebhookEvent): MessagingProviderName {
  const { providerMode } = getConfig();

  if (providerMode === 'hybrid') {
    if (event?.provider && event.provider in providers) {
      return event.provider;
    }
    return 'waba';
  }

  return providerMode;
}

export function getProviderForEvent(event?: WebhookEvent): MessagingProvider {
  return getProviderByName(resolveProviderName(event));
}
