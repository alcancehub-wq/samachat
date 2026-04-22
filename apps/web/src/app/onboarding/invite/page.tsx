'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { setTenantId } from '@/lib/tenant';

interface InviteItem {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
}

export default function OnboardingInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadInvites = async () => {
    setError(null);
    try {
      const data = await apiFetch<InviteItem[]>('/invites/pending');
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  useEffect(() => {
    const token = searchParams?.get('token');
    if (!token) {
      return;
    }
    handleAccept(token);
  }, [searchParams]);

  const handleAccept = async (token: string) => {
    setProcessing(token);
    setError(null);
    try {
      const result = await apiFetch<{ invite: InviteItem; status: string }>(
        `/invites/${token}/accept`,
        { method: 'POST' },
      );
      setTenantId(result.invite.tenant_id);
      router.push('/onboarding/legal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aceitar convite');
      setProcessing(null);
    }
  };

  return (
    <OnboardingLayout
      title="Convites pendentes"
      subtitle="Aceite um convite para entrar em um workspace existente."
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando convites...</p>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {invites.length === 0 ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Nenhum convite pendente.</p>
              <Button variant="secondary" onClick={() => router.push('/onboarding/tenant')}>
                Voltar para workspaces
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {invites.map((invite) => (
                <Card
                  key={invite.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">Tenant {invite.tenant_id}</p>
                    <p className="text-xs text-muted-foreground">Role: {invite.role}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite.token)}
                    disabled={processing === invite.token}
                  >
                    {processing === invite.token ? 'Aceitando...' : 'Aceitar'}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </OnboardingLayout>
  );
}
