'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Plus, RefreshCcw, Upload } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';

interface CampaignProgress {
  total_targets: number;
  sent: number;
  failed: number;
  pending: number;
}

interface CampaignItem {
  id: string;
  name: string;
  message_content: string;
  media_url?: string | null;
  status: string;
  workspace_id: string;
  created_at: string;
  progress: CampaignProgress;
}

interface WorkspaceItem {
  id: string;
  name: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'tagged' | 'conversations'>('all');
  const [tagIds, setTagIds] = useState('');
  const [conversationIds, setConversationIds] = useState('');
  const [activeWorkspace, setActiveWorkspace] = useState('');
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<{ url: string; mime: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await apiFetch<CampaignItem[]>('/campaigns');
      setCampaigns(data);
      setStatus(null);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao carregar campanhas';
      setStatus(messageText);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await apiFetch<WorkspaceItem[]>('/workspaces');
      setWorkspaces(data);
      if (data.length > 0) {
        const first = data[0];
        if (first && !activeWorkspace) {
          setActiveWorkspace(first.id);
        }
      }
    } catch {
      setWorkspaces([]);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    void loadCampaigns();
    void loadWorkspaces();
  }, [loadCampaigns, loadWorkspaces]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const config = getPublicConfig();
    const maxBytes = config.maxUploadMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatus(`Arquivo excede ${config.maxUploadMb} MB.`);
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const tenantId = getTenantId();
      const formData = new FormData();
      formData.append('file', file);

      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (tenantId) headers.set('x-tenant-id', tenantId);

      const response = await fetch(`${config.apiUrl}/messages/upload`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Falha ao enviar arquivo');
      }

      const payload = (await response.json()) as { url: string; mime: string; size: number };
      setMedia(payload);
      setStatus(null);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao enviar arquivo';
      setStatus(messageText);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !message.trim()) {
      setStatus('Preencha nome e mensagem da campanha.');
      return;
    }
    if (!activeWorkspace) {
      setStatus('Selecione um workspace.');
      return;
    }

    const targets =
      targetType === 'tagged'
        ? {
            type: 'tagged',
            tag_ids: tagIds
              .split(',')
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          }
        : targetType === 'conversations'
          ? {
              type: 'conversations',
              conversation_ids: conversationIds
                .split(',')
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
            }
          : { type: 'all' };

    try {
      const created = await apiFetch<CampaignItem>('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          message_content: message.trim(),
          media_url: media?.url ?? null,
          workspace_id: activeWorkspace,
          targets,
        }),
      });
      setCampaigns((prev) => [created, ...prev]);
      setName('');
      setMessage('');
      setTagIds('');
      setConversationIds('');
      setMedia(null);
      setStatus('Campanha criada.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao criar campanha';
      setStatus(messageText);
    }
  };

  const handleStart = async (campaignId: string) => {
    try {
      const updated = await apiFetch<CampaignItem>(`/campaigns/${campaignId}/start`, {
        method: 'POST',
      });
      setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? updated : item)));
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao iniciar campanha';
      setStatus(messageText);
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      const updated = await apiFetch<CampaignItem>(`/campaigns/${campaignId}/pause`, {
        method: 'POST',
      });
      setCampaigns((prev) => prev.map((item) => (item.id === campaignId ? updated : item)));
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao pausar campanha';
      setStatus(messageText);
    }
  };

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [campaigns]);

  return (
    <PageShell title="Campanhas" subtitle="Broadcast">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Criar campanha</CardTitle>
            <CardDescription>Envie mensagem em massa com controle de status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Nome</label>
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                placeholder="Campanha de retorno"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Mensagem</label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                placeholder="Digite a mensagem do disparo"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Workspace</label>
              <select
                className="min-h-[44px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={activeWorkspace}
                onChange={(event) => setActiveWorkspace(event.target.value)}
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
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Target</label>
              <select
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={targetType}
                onChange={(event) => setTargetType(event.target.value as typeof targetType)}
              >
                <option value="all">Todos os contatos</option>
                <option value="tagged">Contatos com tags</option>
                <option value="conversations">Conversas especificas</option>
              </select>
            </div>
            {targetType === 'tagged' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Tags (IDs separados por virgula)</label>
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  placeholder="tag-id-1, tag-id-2"
                  value={tagIds}
                  onChange={(event) => setTagIds(event.target.value)}
                />
              </div>
            )}
            {targetType === 'conversations' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Conversas (IDs separados por virgula)</label>
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  placeholder="conversation-id-1, conversation-id-2"
                  value={conversationIds}
                  onChange={(event) => setConversationIds(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold">Media opcional</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,video/mp4,audio/mpeg,application/pdf"
                onChange={handleUpload}
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleUploadClick} disabled={uploading}>
                <Upload size={14} className="mr-2" />
                {uploading ? 'Enviando...' : 'Selecionar arquivo'}
              </Button>
              {media && (
                <p className="text-xs text-muted-foreground">
                  Arquivo anexado: {media.mime} ({Math.round(media.size / 1024)} KB)
                </p>
              )}
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Plus size={16} className="mr-2" />
              Criar campanha
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
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>Acompanhe o progresso dos disparos.</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={loadCampaigns}>
              <RefreshCcw size={14} className="mr-2" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyState title="Carregando campanhas" />
            ) : sortedCampaigns.length === 0 ? (
              <EmptyState title="Sem campanhas" description="Crie sua primeira campanha." />
            ) : (
              sortedCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onStart={() => handleStart(campaign.id)}
                  onPause={() => handlePause(campaign.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function CampaignCard({
  campaign,
  onStart,
  onPause,
}: {
  campaign: CampaignItem;
  onStart: () => void;
  onPause: () => void;
}) {
  const completed = campaign.progress.sent + campaign.progress.failed;
  const total = campaign.progress.total_targets;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{campaign.name}</p>
          <p className="text-xs text-muted-foreground">Status: {campaign.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onStart}>
            <Play size={14} className="mr-2" />
            Start
          </Button>
          <Button variant="ghost" size="sm" onClick={onPause}>
            <Pause size={14} className="mr-2" />
            Pause
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-muted/60">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Enviadas: {campaign.progress.sent}</span>
          <span>Falhas: {campaign.progress.failed}</span>
          <span>Pendentes: {campaign.progress.pending}</span>
          <span>Total: {campaign.progress.total_targets}</span>
        </div>
      </div>
    </div>
  );
}
