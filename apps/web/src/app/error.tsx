'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GlobalError({
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
    console.error('Global error boundary', { correlationId, error });
  }, [correlationId, error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Algo saiu do esperado</CardTitle>
          <CardDescription>Tente recarregar a pagina.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">ID: {correlationId}</p>
          <Button onClick={reset}>Recarregar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
