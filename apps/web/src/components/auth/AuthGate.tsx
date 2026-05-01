'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { setTenantId } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OnboardingStatus {
  hasMembership: boolean;
  pendingInvites: number;
  legalAccepted: boolean;
  activeTenantId: string | null;
}

const AUTH_GATE_TIMEOUT_MS = 20000;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=604800; samesite=lax`;
}

function getCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async (background = false) => {
    if (!background) {
      setLoading(true);
      setError(null);
    }

    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), AUTH_GATE_TIMEOUT_MS);

    try {
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        AUTH_GATE_TIMEOUT_MS,
        'Tempo limite ao validar sessao',
      );

      if (!sessionResult.data.session) {
        router.replace('/login');
        return;
      }

      setCookie('samachat-auth', '1');

      const status = await apiFetch<OnboardingStatus>('/me/onboarding-status', {
        signal: timeoutController.signal,
      });

      setCookie('samachat-membership', status.hasMembership ? '1' : '0');
      setCookie('samachat-legal', status.legalAccepted ? '1' : '0');
      if (status.activeTenantId) {
        setTenantId(status.activeTenantId);
      }
      if (!status.hasMembership) {
        router.replace('/onboarding/tenant');
        return;
      }
      if (status.pendingInvites > 0) {
        router.replace('/onboarding/invite');
        return;
      }
      if (!status.legalAccepted) {
        router.replace('/onboarding/legal');
        return;
      }

    } catch (err) {
      if (!background) {
        const message = err instanceof Error ? err.message : 'Falha ao validar sessao';
        setError(message);
      }
    } finally {
      clearTimeout(timeout);
      if (!background) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (pathname?.startsWith('/onboarding')) {
      return;
    }

    const hasAuth = getCookie('samachat-auth') === '1';
    const hasMembership = getCookie('samachat-membership') === '1';
    const hasLegal = getCookie('samachat-legal') === '1';

    if (hasAuth && hasMembership && hasLegal) {
      setLoading(false);
      checkStatus(true);
      return;
    }

    checkStatus();
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Validando acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Checando sua sessao e permissoes...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro de acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => void checkStatus()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
