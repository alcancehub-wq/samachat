'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Plus, RefreshCcw, Upload, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { usePermissions } from '@/lib/use-permissions';

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
  start_at: string;
  interval_seconds: number;
  created_at: string;
  progress: CampaignProgress;
}

interface WorkspaceItem {
  id: string;
  name: string;
}

interface DialogItem {
  id: string;
  name: string;
  group_name?: string | null;
  type: 'message' | 'template' | 'automation';
  channel: 'whatsapp';
  status: 'active' | 'inactive';
  message_text?: string | null;
  media_url?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  template_language?: string | null;
  created_at: string;
}

export default function CampaignsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDialog, setSelectedDialog] = useState<DialogItem | null>(null);
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [dialogsLoading, setDialogsLoading] = useState(false);
  const [dialogModalOpen, setDialogModalOpen] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [windowMode, setWindowMode] = useState<'inside_24h' | 'outside_24h'>('inside_24h');
  const [targetType, setTargetType] = useState<'all' | 'tagged' | 'conversations'>('all');
  const [tagIds, setTagIds] = useState('');
  const [conversationIds, setConversationIds] = useState('');
  const [activeWorkspace, setActiveWorkspace] = useState('');
  const [startAt, setStartAt] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState('180');
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<{ url: string; mime: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);

  const warningVersion = 'whatsapp-policy-2026-03';

  const canViewCampaigns = hasPermission(permissions, 'campaigns:view');
  const canCreateCampaigns = hasPermission(permissions, 'campaigns:create');
  const canPauseCampaigns = hasPermission(permissions, 'campaigns:pause');
  const canResumeCampaigns = hasPermission(permissions, 'campaigns:resume');
  const canDeleteCampaigns = hasPermission(permissions, 'campaigns:delete');
  const canUploadFiles = hasPermission(permissions, 'files:create');

  const loadCampaigns = useCallback(async () => {
    if (!canViewCampaigns) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
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
  }, [canViewCampaigns]);

  const loadWorkspaces = useCallback(async () => {
    if (!canCreateCampaigns) {
      setWorkspaces([]);
      return;
    }
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
  }, [activeWorkspace, canCreateCampaigns]);

  const loadDialogs = useCallback(async () => {
    if (!canCreateCampaigns) {
      setDialogs([]);
      return;
    }
    try {
      setDialogsLoading(true);
      const data = await apiFetch<DialogItem[]>('/dialogs');
      setDialogs(data.filter((dialog) => dialog.status === 'active'));
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao carregar dialogos';
      setStatus(messageText);
    } finally {
      setDialogsLoading(false);
    }
  }, [canCreateCampaigns]);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }
    void loadCampaigns();
    void loadWorkspaces();
    if (canCreateCampaigns) {
      setWarningOpen(true);
    }
  }, [loadCampaigns, loadWorkspaces, permissionsLoading, canCreateCampaigns]);

  useEffect(() => {
    setSelectedCampaignIds((prev) => prev.filter((id) => campaigns.some((item) => item.id === id)));
  }, [campaigns]);

  useEffect(() => {
    if (!dialogModalOpen) {
      return;
    }
    void loadDialogs();
  }, [dialogModalOpen, loadDialogs]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadFiles) {
      setStatus('Sem permissao para enviar arquivos.');
      event.target.value = '';
      return;
    }
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
    if (!canCreateCampaigns) {
      setStatus('Sem permissao para criar campanha.');
      return;
    }
    if (!warningAccepted) {
      setStatus('Aceite o aviso antes de criar a campanha.');
      return;
    }
    if (creating) {
      return;
    }
    void handleConfirmCreate();
  };

  const handleConfirmCreate = async () => {
    if (!warningAccepted) {
      setStatus('Confirme o aceite do aviso antes de continuar.');
      return;
    }
    if (!name.trim()) {
      setStatus('Preencha nome da campanha.');
      return;
    }
    if (!activeWorkspace) {
      setStatus('Selecione um workspace.');
      return;
    }
    if (windowMode === 'outside_24h') {
      if (!selectedDialog || selectedDialog.type !== 'template') {
        setStatus('Fora da janela de 24h, selecione um dialogo do tipo template.');
        return;
      }
    } else if (!selectedDialog && !message.trim()) {
      setStatus('Informe a mensagem ou selecione um dialogo.');
      return;
    }
    if (!startAt) {
      setStatus('Informe a data de inicio do envio.');
      return;
    }
    const parsedInterval = Number(intervalSeconds);
    if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
      setStatus('Informe um intervalo valido entre disparos.');
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
      setCreating(true);
      const created = await apiFetch<CampaignItem>('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          message_content: message.trim() || selectedDialog?.message_text || '',
          media_url: media?.url ?? null,
          workspace_id: activeWorkspace,
          dialog_id: selectedDialog?.id ?? null,
          targets,
          warning_acknowledged: true,
          warning_version: warningVersion,
          start_at: new Date(startAt).toISOString(),
          interval_seconds: parsedInterval,
        }),
      });
      setCampaigns((prev) => [created, ...prev]);
      setName('');
      setMessage('');
      setSelectedDialog(null);
      setTagIds('');
      setConversationIds('');
      setMedia(null);
      setStartAt('');
      setIntervalSeconds('180');
      setWarningOpen(false);
      setStatus('Campanha criada.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao criar campanha';
      setStatus(messageText);
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (campaignId: string) => {
    if (!canResumeCampaigns) {
      setStatus('Sem permissao para iniciar campanha.');
      return;
    }
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
    if (!canPauseCampaigns) {
      setStatus('Sem permissao para pausar campanha.');
      return;
    }
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

  const handleDelete = async (campaignId: string, skipConfirm = false) => {
    if (!canDeleteCampaigns) {
      setStatus('Sem permissao para apagar campanha.');
      return;
    }
    if (!skipConfirm && !window.confirm('Deseja realmente excluir esta campanha?')) {
      return;
    }
    try {
      await apiFetch(`/campaigns/${campaignId}`, { method: 'DELETE' });
      setCampaigns((prev) => prev.filter((item) => item.id !== campaignId));
      setStatus('Campanha excluida.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao excluir campanha';
      setStatus(messageText);
    }
  };

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [campaigns]);

  const allCampaignsSelected =
    sortedCampaigns.length > 0 && selectedCampaignIds.length === sortedCampaigns.length;

  const toggleSelectAllCampaigns = () => {
    if (allCampaignsSelected) {
      setSelectedCampaignIds([]);
      return;
    }
    setSelectedCampaignIds(sortedCampaigns.map((campaign) => campaign.id));
  };

  const toggleSelectCampaign = (campaignId: string) => {
    setSelectedCampaignIds((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId],
    );
  };

  const handleBulkDeleteCampaigns = async () => {
    if (!canDeleteCampaigns || selectedCampaignIds.length === 0) {
      return;
    }
    if (!window.confirm(`Deseja excluir ${selectedCampaignIds.length} campanhas selecionadas?`)) {
      return;
    }
    const results = await Promise.allSettled(
      selectedCampaignIds.map((campaignId) => apiFetch(`/campaigns/${campaignId}`, { method: 'DELETE' })),
    );
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      setStatus('Falha ao excluir algumas campanhas.');
    }
    setCampaigns((prev) => prev.filter((item) => !selectedCampaignIds.includes(item.id)));
    setSelectedCampaignIds([]);
  };

  return (
    <PageShell title="Campanhas" subtitle="Broadcast">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {canCreateCampaigns && (
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
                placeholder="Digite a mensagem (dialogo) do disparo"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={Boolean(selectedDialog)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Dialogo salvo (opcional)</label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setDialogModalOpen(true)}>
                  Selecionar dialogo
                </Button>
                {selectedDialog && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDialog(null);
                      setMessage('');
                    }}
                  >
                    Limpar selecao
                  </Button>
                )}
              </div>
              {selectedDialog && (
                <p className="text-xs text-muted-foreground">
                  Selecionado: {selectedDialog.name} ({selectedDialog.type})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Janela WhatsApp</label>
              <select
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={windowMode}
                onChange={(event) => setWindowMode(event.target.value as typeof windowMode)}
              >
                <option value="inside_24h">Dentro de 24h (mensagem livre)</option>
                <option value="outside_24h">Fora de 24h (somente template)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Fora da janela de 24h, apenas dialogos do tipo template sao permitidos.
              </p>
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
              <label className="text-xs font-semibold">Data inicio do envio</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Intervalo entre disparos (segundos)</label>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={intervalSeconds}
                onChange={(event) => setIntervalSeconds(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 120 a 180 segundos.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Media opcional</label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,video/mp4,audio/mpeg,application/pdf"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUploadClick}
                disabled={uploading || !canUploadFiles}
              >
                <Upload size={14} className="mr-2" />
                {uploading ? 'Enviando...' : 'Selecionar arquivo'}
              </Button>
              {media && (
                <p className="text-xs text-muted-foreground">
                  Arquivo anexado: {media.mime} ({Math.round(media.size / 1024)} KB)
                </p>
              )}
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={creating}>
              <Plus size={16} className="mr-2" />
              {creating ? 'Criando...' : 'Criar campanha'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setWarningOpen(true)}
            >
              Rever aviso
            </Button>
            {status && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
                {status}
              </div>
            )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>Acompanhe o progresso dos disparos.</CardDescription>
              {sortedCampaigns.length > 0 && canDeleteCampaigns && (
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allCampaignsSelected}
                    onChange={toggleSelectAllCampaigns}
                    aria-label="Selecionar todas as campanhas"
                  />
                  Selecionar todas
                </label>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={loadCampaigns}>
                <RefreshCcw size={14} className="mr-2" />
                Atualizar
              </Button>
              {canDeleteCampaigns && selectedCampaignIds.length > 0 && (
                <Button size="sm" variant="secondary" onClick={handleBulkDeleteCampaigns}>
                  <Trash2 size={14} className="mr-2" />
                  Excluir selecionados
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <EmptyState title="Carregando campanhas" />
            ) : !canViewCampaigns ? (
              <EmptyState
                title="Sem permissao"
                description="Voce nao possui permissao para ver campanhas."
              />
            ) : sortedCampaigns.length === 0 ? (
              <EmptyState title="Sem campanhas" description="Crie sua primeira campanha." />
            ) : (
              sortedCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  selected={selectedCampaignIds.includes(campaign.id)}
                  onToggleSelect={() => toggleSelectCampaign(campaign.id)}
                  onStart={canResumeCampaigns ? () => handleStart(campaign.id) : null}
                  onPause={canPauseCampaigns ? () => handlePause(campaign.id) : null}
                  onDelete={canDeleteCampaigns ? () => handleDelete(campaign.id) : null}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
      {warningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => {
              setWarningOpen(false);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl">
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-rose-600">Atencao</p>
                <p className="mt-2 text-sm text-rose-600">
                  O envio de mensagens PROMOCIONAIS, PUBLICITARIAS, MARKETING, ou SPAM em geral e
                  explicitamente PROIBIDO nos termos de uso do WhatsApp.
                </p>
                <p className="mt-2 text-sm text-rose-600">
                  O envio em massa desse tipo de mensagem mesmo que seja para poucas pessoas (mesmo que
                  ja sejam seus clientes) podera acarretar no banimento imediato do seu numero no WhatsApp.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
                <p className="text-sm font-semibold">
                  Como envio mensagens promocionais/publicitarias para meu cliente?
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  O essencial e fazer com que o seu cliente inicie a conversa no WhatsApp. Para isto,
                  voce deve contacta-lo atraves de outros meios/plataformas.
                </p>
                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <p>Exemplos:</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Envie mensagens via SMS e convide para iniciar uma conversa por WhatsApp.</li>
                    <li>Envie mensagens via EMAIL e convide para iniciar uma conversa por WhatsApp.</li>
                    <li>
                      Envie mensagens via FACEBOOK/INSTAGRAM e convide para iniciar uma conversa por
                      WhatsApp.
                    </li>
                    <li>
                      Crie campanhas de publicidade na internet (Google/Facebook/Instagram/Youtube) e
                      convide para iniciar uma conversa por WhatsApp.
                    </li>
                  </ul>
                </div>
              </div>

              <label className="flex items-center gap-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={warningAccepted}
                  onChange={(event) => setWarningAccepted(event.target.checked)}
                />
                Entendo o risco de banimento, quero continuar.
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setWarningOpen(false);
                }}
                disabled={!warningAccepted}
              >
                Aceitar aviso
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setWarningOpen(false);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      {dialogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => setDialogModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Selecionar dialogo</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha um dialogo salvo para usar na campanha.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDialogModalOpen(false)}>
                Fechar
              </Button>
            </div>
            <div className="mt-4">
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-sm"
                placeholder="Buscar dialogo"
                value={dialogSearch}
                onChange={(event) => setDialogSearch(event.target.value)}
              />
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {dialogsLoading ? (
                <p className="text-sm text-muted-foreground">Carregando dialogos...</p>
              ) : (
                dialogs
                  .filter((dialog) =>
                    dialog.name.toLowerCase().includes(dialogSearch.toLowerCase()),
                  )
                  .filter((dialog) => (windowMode === 'outside_24h' ? dialog.type === 'template' : dialog.type !== 'automation'))
                  .map((dialog) => (
                    <button
                      key={dialog.id}
                      type="button"
                      className="w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left text-sm hover:bg-muted/40"
                      onClick={() => {
                        setSelectedDialog(dialog);
                        if (dialog.type === 'message') {
                          setMessage(dialog.message_text || '');
                        }
                        setDialogModalOpen(false);
                      }}
                    >
                      <p className="text-sm font-semibold">{dialog.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dialog.group_name || 'Sem grupo'} • {dialog.type}
                      </p>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function CampaignCard({
  campaign,
  selected,
  onToggleSelect,
  onStart,
  onPause,
  onDelete,
}: {
  campaign: CampaignItem;
  selected: boolean;
  onToggleSelect: () => void;
  onStart: (() => void) | null;
  onPause: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const completed = campaign.progress.sent + campaign.progress.failed;
  const total = campaign.progress.total_targets;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Selecionar ${campaign.name}`}
            />
            <p className="text-sm font-semibold">{campaign.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">Status: {campaign.status}</p>
        </div>
        <div className="flex items-center gap-2">
          {onStart && (
            <Button variant="secondary" size="sm" onClick={onStart}>
              <Play size={14} className="mr-2" />
              Start
            </Button>
          )}
          {onPause && (
            <Button variant="ghost" size="sm" onClick={onPause}>
              <Pause size={14} className="mr-2" />
              Pause
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 size={14} className="mr-2" />
              Excluir
            </Button>
          )}
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
