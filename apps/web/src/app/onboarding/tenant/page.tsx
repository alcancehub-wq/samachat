'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { setTenantId } from '@/lib/tenant';

interface MembershipItem {
  membership: {
    id: string;
    tenant_id: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function OnboardingTenantPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');

  useEffect(() => {
    apiFetch<MembershipItem[]>('/me/memberships')
      .then(setMemberships)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!tenantSlug && tenantName) {
      setTenantSlug(slugify(tenantName));
    }
  }, [tenantName, tenantSlug]);

  const canCreate = tenantName.trim().length >= 2 && tenantSlug.trim().length >= 2;

  const handleSelect = (tenantId: string) => {
    setTenantId(tenantId);
    router.push('/onboarding/legal');
  };

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const tenant = await apiFetch<{ id: string }>('/tenants', {
        method: 'POST',
        body: JSON.stringify({ name: tenantName, slug: tenantSlug }),
      });
      setTenantId(tenant.id);
      router.push('/onboarding/legal');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout
      title="Defina seu workspace"
      subtitle="Crie um novo tenant ou selecione um existente."
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando seus workspaces...</p>
      ) : (
        <div className="space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {memberships.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Seus workspaces</h3>
              <div className="grid gap-3">
                {memberships.map((item) => (
                  <Card
                    key={item.tenant.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{item.tenant.slug}</p>
                    </div>
                    <Button size="sm" onClick={() => handleSelect(item.tenant.id)}>
                      Usar
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
            <h3 className="text-sm font-semibold">Criar novo workspace</h3>
            <label className="block text-sm">
              <span className="text-muted-foreground">Nome</span>
              <input
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Samachat Prime"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Slug</span>
              <input
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="samachat-prime"
              />
            </label>
            <Button onClick={handleCreate} disabled={!canCreate || saving}>
              {saving ? 'Criando...' : 'Criar workspace'}
            </Button>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
