'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getTenantId } from '@/lib/tenant';

interface OnboardingStatus {
  hasMembership: boolean;
  pendingInvites: number;
  legalAccepted: boolean;
  activeTenantId: string | null;
}

const publicRoutes = ['/login', '/terms', '/privacy', '/cookies', '/offline'];
const GUARD_TIMEOUT_MS = 8000;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=604800; samesite=lax`;
}

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pathname) {
      setLoading(false);
      return;
    }

    if (pathname.startsWith('/onboarding') || publicRoutes.includes(pathname)) {
      setLoading(false);
      return;
    }

    let active = true;
    const failSafe = setTimeout(() => {
      if (active) {
        setLoading(false);
      }
    }, GUARD_TIMEOUT_MS);

    const run = async () => {
      try {
        const status = await apiFetch<OnboardingStatus>('/me/onboarding-status', {}, getTenantId());

        setCookie('samachat-membership', status.hasMembership ? '1' : '0');
        setCookie('samachat-legal', status.legalAccepted ? '1' : '0');
        if (status.activeTenantId) {
          setCookie('samachat-tenant', status.activeTenantId);
        }

        if (status.pendingInvites > 0) {
          router.replace('/onboarding/invite');
          return;
        }

        if (!status.hasMembership) {
          router.replace('/onboarding/tenant');
          return;
        }

        if (!status.legalAccepted) {
          router.replace('/onboarding/legal');
          return;
        }

        if (active) {
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
      clearTimeout(failSafe);
    };
  }, [pathname, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>;
  }

  return <>{children}</>;
}
