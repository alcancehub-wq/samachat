'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Eye, Plus, RefreshCcw, Trash2, Edit3, Upload } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getPublicConfig } from '@/lib/public-config';
import { supabase } from '@/lib/supabase';
import { getTenantId } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { usePermissions } from '@/lib/use-permissions';
import { DialogsShell } from '@/components/dialogs/DialogsShell';
import { useRouter, useSearchParams } from 'next/navigation';

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
  template_variables?: Record<string, string> | null;
  automation_actions?: Array<{ action_type: string; payload: Record<string, unknown> }> | null;
  created_at: string;
}

interface DialogActionInput {
  action_type: 'respond' | 'tag' | 'delegate' | 'send_template' | 'call_dialog';
  value: string;
}

export default function DialogsPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'biblioteca';
  const showForm = activeTab === 'criar';
  const showList = activeTab === 'biblioteca';
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<DialogItem | null>(null);
  const [preview, setPreview] = useState<DialogItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [type, setType] = useState<'message' | 'template' | 'automation'>('message');
  const [dialogStatus, setDialogStatus] = useState<'active' | 'inactive'>('active');
  const [messageText, setMessageText] = useState('');
  const [media, setMedia] = useState<{ url: string; mime: string; size: number } | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('pt_BR');
  const [templateVariables, setTemplateVariables] = useState('');
  const [actions, setActions] = useState<DialogActionInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canView = hasPermission(permissions, 'dialogs:view');
  const canCreate = hasPermission(permissions, 'dialogs:create');
  const canEdit = hasPermission(permissions, 'dialogs:edit');
  const canDelete = hasPermission(permissions, 'dialogs:delete');

  const loadDialogs = useCallback(async () => {
    if (!canView) {
      setDialogs([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<DialogItem[]>('/dialogs');
      setDialogs(data);
      setStatus(null);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao carregar dialogos';
      setStatus(messageText);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }
    void loadDialogs();
  }, [loadDialogs, permissionsLoading]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => dialogs.some((dialog) => dialog.id === id)));
  }, [dialogs]);

  const resetForm = () => {
    setName('');
    setGroupName('');
    setType('message');
    setDialogStatus('active');
    setMessageText('');
    setMedia(null);
    setTemplateName('');
    setTemplateId('');
    setTemplateLanguage('pt_BR');
    setTemplateVariables('');
    setActions([]);
    setEditing(null);
  };

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

  const parseTemplateVariables = () => {
    if (!templateVariables.trim()) {
      return null;
    }
    const entries = templateVariables
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [key, value] = line.split('->').map((part) => part.trim());
        return key && value ? [key, value] : null;
      })
      .filter(Boolean) as Array<[string, string]>;

    return entries.length > 0 ? Object.fromEntries(entries) : null;
  };

  const buildActionsPayload = () => {
    if (actions.length === 0) {
      return null;
    }
    return actions.map((action) => ({
      action_type: action.action_type,
      payload: action.action_type === 'respond' ? { message: action.value } : { value: action.value },
    }));
  };

  const handleSave = async () => {
    if (!canCreate && !editing) {
      setStatus('Sem permissao para criar dialogo.');
      return;
    }
    if (!name.trim()) {
      setStatus('Informe o nome do dialogo.');
      return;
    }
    if (type === 'message' && !messageText.trim()) {
      setStatus('Informe a mensagem do dialogo.');
      return;
    }
    if (type === 'template' && (!templateName.trim() || !templateId.trim())) {
      setStatus('Informe nome e ID do template.');
      return;
    }
    if (type === 'automation' && actions.length === 0) {
      setStatus('Adicione ao menos uma acao para automacao.');
      return;
    }

    const payload = {
      name: name.trim(),
      group_name: groupName.trim() || null,
      type,
      status: dialogStatus,
      message_text: messageText.trim() || null,
      media_url: media?.url ?? null,
      template_name: templateName.trim() || null,
      template_id: templateId.trim() || null,
      template_language: templateLanguage.trim() || null,
      template_variables: parseTemplateVariables(),
      automation_actions: buildActionsPayload(),
    };

    try {
      if (editing) {
        const updated = await apiFetch<DialogItem>(`/dialogs/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setDialogs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setStatus('Dialogo atualizado.');
      } else {
        const created = await apiFetch<DialogItem>('/dialogs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setDialogs((prev) => [created, ...prev]);
        setStatus('Dialogo criado.');
      }
      resetForm();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao salvar dialogo';
      setStatus(messageText);
    }
  };

  const handleEdit = (dialog: DialogItem) => {
    setEditing(dialog);
    setName(dialog.name);
    setGroupName(dialog.group_name || '');
    setType(dialog.type);
    setDialogStatus(dialog.status);
    setMessageText(dialog.message_text || '');
    setMedia(dialog.media_url ? { url: dialog.media_url, mime: '', size: 0 } : null);
    setTemplateName(dialog.template_name || '');
    setTemplateId(dialog.template_id || '');
    setTemplateLanguage(dialog.template_language || 'pt_BR');
    setTemplateVariables(
      dialog.template_variables
        ? Object.entries(dialog.template_variables)
            .map(([key, value]) => `${key} -> ${value}`)
            .join('\n')
        : '',
    );
    setActions(
      (dialog.automation_actions || []).map((action) => ({
        action_type: action.action_type as DialogActionInput['action_type'],
        value: (action.payload as { value?: string; message?: string })?.value ||
          (action.payload as { value?: string; message?: string })?.message ||
          '',
      })),
    );
    router.push('/dialogs?tab=criar');
  };

  const handleDuplicate = async (dialog: DialogItem) => {
    if (!canCreate) {
      setStatus('Sem permissao para duplicar dialogo.');
      return;
    }
    try {
      const payload = {
        name: `${dialog.name} (copia)` ,
        group_name: dialog.group_name ?? null,
        type: dialog.type,
        status: dialog.status,
        message_text: dialog.message_text ?? null,
        media_url: dialog.media_url ?? null,
        template_name: dialog.template_name ?? null,
        template_id: dialog.template_id ?? null,
        template_language: dialog.template_language ?? null,
        template_variables: dialog.template_variables ?? null,
        automation_actions: dialog.automation_actions ?? null,
      };
      const created = await apiFetch<DialogItem>('/dialogs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDialogs((prev) => [created, ...prev]);
      setStatus('Dialogo duplicado.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao duplicar dialogo';
      setStatus(messageText);
    }
  };

  const handleDelete = async (dialogId: string, skipConfirm = false) => {
    if (!canDelete) {
      setStatus('Sem permissao para apagar dialogo.');
      return;
    }
    if (!skipConfirm && !window.confirm('Deseja realmente excluir este dialogo?')) {
      return;
    }
    try {
      await apiFetch(`/dialogs/${dialogId}`, { method: 'DELETE' });
      setDialogs((prev) => prev.filter((item) => item.id !== dialogId));
      setStatus('Dialogo excluido.');
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Falha ao excluir dialogo';
      setStatus(messageText);
    }
  };

  const groupedDialogs = useMemo(() => dialogs, [dialogs]);

  const allSelected = groupedDialogs.length > 0 && selectedIds.length === groupedDialogs.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(groupedDialogs.map((dialog) => dialog.id));
  };

  const toggleSelect = (dialogId: string) => {
    setSelectedIds((prev) =>
      prev.includes(dialogId) ? prev.filter((id) => id !== dialogId) : [...prev, dialogId],
    );
  };

  const handleBulkDelete = async () => {
    if (!canDelete || selectedIds.length === 0) {
      return;
    }
    if (!window.confirm(`Deseja excluir ${selectedIds.length} dialogos selecionados?`)) {
      return;
    }

    const results = await Promise.allSettled(
      selectedIds.map((dialogId) => apiFetch(`/dialogs/${dialogId}`, { method: 'DELETE' })),
    );

    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      setStatus('Falha ao excluir alguns dialogos.');
    }

    setDialogs((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  };

  const handleAddAction = () => {
    setActions((prev) => [...prev, { action_type: 'respond', value: '' }]);
  };

  const handleActionChange = (index: number, value: Partial<DialogActionInput>) => {
    setActions((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...value } : item)),
    );
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <PageShell title="Dialogos" subtitle="Biblioteca">
      <DialogsShell />
      <div className={showForm && showList ? 'grid gap-6 lg:grid-cols-[360px_1fr]' : 'grid gap-6'}>
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editing ? 'Editar dialogo' : 'Criar dialogo'}</CardTitle>
              <CardDescription>Dialogos simples para campanhas e automacoes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Nome</label>
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex: Boas-vindas"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Grupo (opcional)</label>
              <input
                className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Ex: Vendas"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Tipo</label>
                <select
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={type}
                  onChange={(event) => setType(event.target.value as typeof type)}
                >
                  <option value="message">Message</option>
                  <option value="template">Template (Gupshup)</option>
                  <option value="automation">Automation</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Status</label>
                <select
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={dialogStatus}
                  onChange={(event) => setDialogStatus(event.target.value as typeof dialogStatus)}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>

            {type === 'message' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Mensagem</label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Digite a mensagem"
                />
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
                    disabled={uploading}
                  >
                    <Upload size={14} className="mr-2" />
                    {uploading ? 'Enviando...' : 'Selecionar arquivo'}
                  </Button>
                  {media && (
                    <p className="text-xs text-muted-foreground">Arquivo: {media.url}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Variaveis disponiveis: {'{{name}}'}, {'{{phone}}'}, {'{{custom_field}}'}
                </p>
              </div>
            )}

            {type === 'template' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold">Template Name</label>
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="appointment_reminder"
                />
                <label className="text-xs font-semibold">Template ID (Gupshup)</label>
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  placeholder="template-id"
                />
                <label className="text-xs font-semibold">Idioma</label>
                <input
                  className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={templateLanguage}
                  onChange={(event) => setTemplateLanguage(event.target.value)}
                  placeholder="pt_BR"
                />
                <label className="text-xs font-semibold">Variaveis (uma por linha)</label>
                <textarea
                  className="min-h-[90px] w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                  value={templateVariables}
                  onChange={(event) => setTemplateVariables(event.target.value)}
                  placeholder="{{1}} -> name\n{{2}} -> date"
                />
              </div>
            )}

            {type === 'automation' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold">Acoes</label>
                {actions.map((action, index) => (
                  <div key={`${action.action_type}-${index}`} className="flex flex-wrap gap-2">
                    <select
                      className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs"
                      value={action.action_type}
                      onChange={(event) =>
                        handleActionChange(index, {
                          action_type: event.target.value as DialogActionInput['action_type'],
                        })
                      }
                    >
                      <option value="respond">Respond</option>
                      <option value="tag">Tag</option>
                      <option value="delegate">Delegate</option>
                      <option value="send_template">Send Template</option>
                      <option value="call_dialog">Call Dialog</option>
                    </select>
                    <input
                      className="flex-1 rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs"
                      placeholder="Valor"
                      value={action.value}
                      onChange={(event) => handleActionChange(index, { value: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAction(index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={handleAddAction}>
                  <Plus size={14} className="mr-2" />
                  Adicionar acao
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={!canCreate && !editing}>
                {editing ? 'Salvar alteracoes' : 'Criar dialogo'}
              </Button>
              {editing && (
                <Button variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>

            {status && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
                {status}
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {showList && (
          <Card>
            <CardHeader className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>Dialogos</CardTitle>
                <CardDescription>Biblioteca de mensagens reutilizaveis.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={loadDialogs}>
                  <RefreshCcw size={14} className="mr-2" />
                  Atualizar
                </Button>
                {canDelete && selectedIds.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={handleBulkDelete}>
                    <Trash2 size={14} className="mr-2" />
                    Excluir selecionados
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando dialogos...</p>
              ) : groupedDialogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum dialogo cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="pb-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                            aria-label="Selecionar todos"
                          />
                        </th>
                        <th className="pb-2">Nome</th>
                        <th className="pb-2">Grupo</th>
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Canal</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Criado em</th>
                        <th className="pb-2">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedDialogs.map((dialog) => (
                        <tr key={dialog.id} className="border-t border-border/40">
                          <td className="py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(dialog.id)}
                              onChange={() => toggleSelect(dialog.id)}
                              aria-label={`Selecionar ${dialog.name}`}
                            />
                          </td>
                          <td className="py-2 font-semibold">{dialog.name}</td>
                          <td className="py-2">{dialog.group_name || '-'}</td>
                          <td className="py-2">{dialog.type}</td>
                          <td className="py-2">{dialog.channel}</td>
                          <td className="py-2">{dialog.status}</td>
                          <td className="py-2">
                            {new Date(dialog.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreview(dialog)}
                              >
                                <Eye size={14} className="mr-2" />
                                Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(dialog)}
                                disabled={!canEdit}
                              >
                                <Edit3 size={14} className="mr-2" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(dialog)}
                                disabled={!canCreate}
                              >
                                <Copy size={14} className="mr-2" />
                                Duplicar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(dialog.id)}
                                disabled={!canDelete}
                              >
                                <Trash2 size={14} className="mr-2" />
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => setPreview(null)}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Preview</h3>
            <p className="mt-2 text-sm text-muted-foreground">{preview.name}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p>Tipo: {preview.type}</p>
              <p>Grupo: {preview.group_name || '-'}</p>
              {preview.message_text && <p>Mensagem: {preview.message_text}</p>}
              {preview.template_name && <p>Template: {preview.template_name}</p>}
            </div>
            <div className="mt-6">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
