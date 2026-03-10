'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getTenantId } from '@/lib/tenant';
import { PageShell } from '@/components/layout/PageShell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MembershipItem {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}

interface TenantMembershipResponse {
  membership: { id: string; role: string; tenant_id: string };
  tenant: { id: string };
}

export default function TeamSettingsPage() {
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const loadMembers = async () => {
    setError(null);
    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Tenant nao selecionado.');
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<MembershipItem[]>(`/tenants/${tenantId}/memberships`);
      setMemberships(data);

      const myMemberships = await apiFetch<TenantMembershipResponse[]>('/me/memberships');
      const current = myMemberships.find((item) => item.tenant.id === tenantId);
      setCurrentRole(current?.membership.role ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar time');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async () => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Tenant nao selecionado.');
      return;
    }
    if (!inviteEmail) {
      setError('Informe um email valido.');
      return;
    }

    setInviting(true);
    setError(null);

    try {
      await apiFetch(`/tenants/${tenantId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail('');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (membershipId: string, role: string) => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Tenant nao selecionado.');
      return;
    }
    try {
      await apiFetch(`/tenants/${tenantId}/memberships/${membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar role');
    }
  };

  const handleRemove = async (membershipId: string) => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setError('Tenant nao selecionado.');
      return;
    }
    try {
      await apiFetch(`/tenants/${tenantId}/memberships/${membershipId}`, {
        method: 'DELETE',
      });
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover');
    }
  };

  const canManage = currentRole === 'admin' || currentRole === 'manager';
  const canAdmin = currentRole === 'admin';

  return (
    <PageShell title="Configuracoes" subtitle="Time">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Time</h2>
          <p className="text-sm text-muted-foreground">Gerencie membros e permissoes.</p>
        </div>

        {loading ? (
          <Card className="rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">
            Carregando time...
          </Card>
        ) : (
          <div className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!canManage && currentRole && (
              <Card className="rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">
                Voce nao possui permissao para gerenciar o time deste workspace.
              </Card>
            )}

            <div className="space-y-3">
              {memberships.map((member) => (
                <Card
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium">{member.user.full_name ?? member.user.email}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      disabled={!canAdmin}
                      value={member.role}
                      onChange={(event) => handleRoleChange(member.id, event.target.value)}
                      className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="agent">Agent</option>
                    </select>
                    {canAdmin && (
                      <Button size="sm" variant="secondary" onClick={() => handleRemove(member.id)}>
                        Remover
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="space-y-4 rounded-2xl border border-border/60 p-4">
              <h3 className="text-sm font-semibold">Convidar membro</h3>
              <div className="grid gap-3 md:grid-cols-[1fr,150px,auto]">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm"
                  placeholder="email@empresa.com"
                  disabled={!canManage}
                />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                  className="rounded-xl border border-border/60 bg-background/70 px-3 py-3 text-sm"
                  disabled={!canManage}
                >
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                </select>
                <Button onClick={handleInvite} disabled={!canManage || inviting}>
                  {inviting ? 'Enviando...' : 'Convidar'}
                </Button>
              </div>
              {!canManage && (
                <p className="text-xs text-muted-foreground">
                  Somente administradores e managers podem convidar novos membros.
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}
