'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';

interface AutomationAction {
  id: string;
  action_type: string;
  payload: Record<string, unknown>;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  actions: AutomationAction[];
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const loadAutomations = useCallback(async () => {
    try {
      const data = await apiFetch<Automation[]>('/automations');
      setAutomations(data);
      setStatus(null);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao carregar automacoes';
      setStatus(messageText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAutomations();
  }, [loadAutomations]);

  const handleCreate = async () => {
    if (!name.trim() || !message.trim()) {
      setStatus('Preencha nome e mensagem para criar a automacao.');
      return;
    }

    try {
      const created = await apiFetch<Automation>('/automations', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          trigger_type: 'message_received',
          is_active: true,
          actions: [
            {
              action_type: 'send_message',
              payload: { content: message.trim() },
            },
          ],
        }),
      });

      setAutomations((prev) => [created, ...prev]);
      setName('');
      setMessage('');
      setStatus('Automacao criada com sucesso.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao criar automacao';
      setStatus(messageText);
    }
  };

  const toggleAutomation = async (automation: Automation) => {
    try {
      const updated = await apiFetch<Automation>(`/automations/${automation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !automation.is_active }),
      });
      setAutomations((prev) =>
        prev.map((item) => (item.id === automation.id ? updated : item)),
      );
      setStatus(updated.is_active ? 'Automacao ativada.' : 'Automacao pausada.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao atualizar automacao';
      setStatus(messageText);
    }
  };

  return (
    <PageShell title="Automacoes" subtitle="Workflows">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar automacao</CardTitle>
            <CardDescription>
              Trigger: message_received · Action: send_message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Nome</label>
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                placeholder="Auto-reply boas vindas"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Mensagem automatica</label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                placeholder="Oi! Recebemos sua mensagem e ja vamos ajudar voce."
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Plus size={16} className="mr-2" />
              Criar automacao
            </Button>
            {status && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
                {status}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Automacoes ativas</CardTitle>
              <CardDescription>Controle o que dispara automaticamente.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={loadAutomations}>
              <Sparkles size={14} className="mr-2" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyState title="Carregando automacoes" />
            ) : automations.length === 0 ? (
              <EmptyState
                title="Sem automacoes"
                description="Crie uma automacao para responder novas mensagens."
              />
            ) : (
              automations.map((automation) => (
                <div
                  key={automation.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/70 px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{automation.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Trigger: {automation.trigger_type} · Actions: {automation.actions.length}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleAutomation(automation)}
                  >
                    {automation.is_active ? (
                      <ToggleRight size={16} className="mr-2" />
                    ) : (
                      <ToggleLeft size={16} className="mr-2" />
                    )}
                    {automation.is_active ? 'Ativa' : 'Pausada'}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
