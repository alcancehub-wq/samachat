'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';

export default function OnboardingDonePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <OnboardingLayout title="Tudo pronto" subtitle="Seu acesso foi liberado.">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Redirecionando para o dashboard...</p>
        <Button onClick={() => router.push('/dashboard')}>Ir para dashboard</Button>
      </div>
    </OnboardingLayout>
  );
}
