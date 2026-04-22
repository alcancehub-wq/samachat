import { getConfig } from '@samachat/config';
import type { MessagingProvider } from './core/MessagingProvider';
import type { MessagingProviderName, WebhookEvent } from './core/types';
import { QrProvider } from './providers/qr/QrProvider';
import { WabaProvider } from './providers/waba/WabaProvider';
import { ProviderPool } from './provider-pool';

function createPool<T>(build: () => T, size: number): ProviderPool<T> {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 1;
  const providers = Array.from({ length: safeSize }, () => build());
  return new ProviderPool(providers);
}

const providerPools: Record<MessagingProviderName, ProviderPool<MessagingProvider>> = {
  qr: createPool(
    () => new QrProvider(),
    getConfig().providerPool.sizes.qr || getConfig().providerPool.defaultSize,
  ),
  waba: createPool(
    () => new WabaProvider(),
    getConfig().providerPool.sizes.waba || getConfig().providerPool.defaultSize,
  ),
};

export function getProviderByName(name: MessagingProviderName): MessagingProvider {
  return providerPools[name].next();
}

export function resolveProviderName(event?: WebhookEvent): MessagingProviderName {
  const { providerMode } = getConfig();

  if (providerMode === 'hybrid') {
    if (event?.provider && event.provider in providerPools) {
      return event.provider;
    }
    return 'waba';
  }

  return providerMode;
}

export function getProviderForEvent(event?: WebhookEvent): MessagingProvider {
  return getProviderByName(resolveProviderName(event));
}
