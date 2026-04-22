'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { SettingsShell } from '@/components/settings/SettingsShell';

interface WorkspaceItem {
  id: string;
  name: string;
}


export default function WorkspaceSettingsPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [name, setName] = useState('');
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

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

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

  return (
    <PageShell title="Configuracoes" subtitle="Workspace">
      <SettingsShell />
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
      </div>

      {status && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}
    </PageShell>
  );
}
