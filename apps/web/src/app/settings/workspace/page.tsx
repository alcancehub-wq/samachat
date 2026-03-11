'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';
import { getTenantId } from '@/lib/tenant';

interface WorkspaceItem {
  id: string;
  name: string;
}

interface WorkspaceUserItem {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}

export default function WorkspaceSettingsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [users, setUsers] = useState<WorkspaceUserItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [status, setStatus] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await apiFetch<WorkspaceItem[]>('/workspaces');
      setWorkspaces(data);
      if (data.length > 0) {
        setActiveId((prev) => prev || data[0].id);
        setName(data[0].name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar workspaces';
      setStatus(message);
    }
  }, []);

  const loadUsers = useCallback(
    async (workspaceId: string) => {
      try {
        const data = await apiFetch<WorkspaceUserItem[]>(`/workspaces/${workspaceId}/users`);
        setUsers(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar usuarios';
        setStatus(message);
      }
    },
  );

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (activeId) {
      void loadUsers(activeId);
    }
  }, [activeId, loadUsers]);

  const handleRename = async () => {
    if (!activeId || !name.trim()) {
      return;
    }
    try {
      const updated = await apiFetch<WorkspaceItem>(`/workspaces/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      setWorkspaces((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setStatus('Workspace atualizado.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao renomear workspace';
      setStatus(message);
    }
  };

  const handleAddUser = async () => {
    if (!activeId || !email.trim()) {
      return;
    }
    try {
      await apiFetch(`/workspaces/${activeId}/users`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setEmail('');
      setRole('agent');
      await loadUsers(activeId);
      setStatus('Usuario adicionado.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao adicionar usuario';
      if (message.includes('User not found')) {
        const tenantId = getTenantId();
        if (!tenantId) {
          setStatus('Selecione um workspace antes de convidar usuarios.');
          return;
        }
        try {
          await apiFetch(`/tenants/${tenantId}/invites`, {
            method: 'POST',
            body: JSON.stringify({ email: email.trim(), role }),
          });
          setEmail('');
          setRole('agent');
          setStatus('Convite enviado.');
          return;
        } catch (inviteError) {
          const inviteMessage =
            inviteError instanceof Error ? inviteError.message : 'Falha ao enviar convite';
          setStatus(inviteMessage);
          return;
        }
      }
      setStatus(message);
    }
  };

  const handleRemoveUser = async (workspaceUserId: string) => {
    if (!activeId) {
      return;
    }
    try {
      await apiFetch(`/workspaces/${activeId}/users/${workspaceUserId}`, {
        method: 'DELETE',
      });
      await loadUsers(activeId);
      setStatus('Usuario removido.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao remover usuario';
      setStatus(message);
    }
  };

  return (
    <PageShell title="Workspace" subtitle="Configuracoes">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace atual</CardTitle>
            <CardDescription>Renomeie e selecione o workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="min-h-[44px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              value={activeId}
              onChange={(event) => {
                const id = event.target.value;
                setActiveId(id);
                const selected = workspaces.find((item) => item.id === id);
                setName(selected?.name ?? '');
              }}
            >
              {workspaces.length === 0 ? (
                <option value="" disabled>
                  Nenhum workspace disponivel
                </option>
              ) : (
                workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))
              )}
            </select>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Nome</label>
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button onClick={handleRename} className="w-full">
              Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios do workspace</CardTitle>
            <CardDescription>Gerencie permissoes e acessos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.length === 0 ? (
              <EmptyState title="Sem usuarios" description="Adicione o primeiro usuario." />
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{user.user.full_name || user.user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border/60 px-2 py-1 text-[0.65rem]">
                        {user.role}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs font-semibold">Adicionar usuario</p>
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  placeholder="email@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <select
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="agent">agent</option>
                </select>
                <Button onClick={handleAddUser} className="w-full">
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {status && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}
    </PageShell>
  );
}
