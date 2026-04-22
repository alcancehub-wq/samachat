'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { clearServiceWorkers, registerServiceWorker } from '@/lib/service-worker';

export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      clearServiceWorkers().catch(() => {
        // Silent by design for MVP
      });
      return;
    }

    registerServiceWorker(() => setUpdateReady(true)).catch(() => {
      // Silent by design for MVP
    });
  }, []);

  const handleRefresh = async () => {
    if (!navigator.serviceWorker?.controller) {
      window.location.reload();
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  if (!updateReady) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl backdrop-blur">
      <p className="text-sm font-semibold">Nova versao disponivel</p>
      <p className="mt-1 text-xs text-muted-foreground">Atualize para obter melhorias.</p>
      <Button size="sm" className="mt-3" onClick={handleRefresh}>
        Atualizar agora
      </Button>
    </div>
  );
}
