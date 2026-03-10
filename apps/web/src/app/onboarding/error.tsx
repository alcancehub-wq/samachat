'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const correlationId = useMemo(
    () => (crypto.randomUUID ? crypto.randomUUID() : `corr-${Date.now()}`),
    [],
  );

  useEffect(() => {
    console.error('Onboarding error boundary', { correlationId, error });
  }, [correlationId, error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Falha no onboarding</CardTitle>
          <CardDescription>Verifique sua conexao e tente novamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">ID: {correlationId}</p>
          <Button onClick={reset}>Tentar novamente</Button>
        </CardContent>
      </Card>
    </div>
  );
}
