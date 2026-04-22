'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DialogsShell } from '@/components/dialogs/DialogsShell';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TagItem {
  id: string;
  name: string;
  color_background: string;
  color_text: string;
  sort_order: number;
  created_at: string;
}

interface TagUsage {
  contacts: number;
  conversations: number;
  campaigns: number;
  automations: number;
  dialogs: number;
}

const DEFAULT_BACKGROUND = '#EEF1F5';
const DEFAULT_TEXT = '#2C2F33';

export default function DialogTagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [originalTags, setOriginalTags] = useState<Record<string, TagItem>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<{ item: TagItem; usage: TagUsage } | null>(null);

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<TagItem[]>('/dialogs/tags');
      setTags(data);
      setOriginalTags(
        Object.fromEntries(data.map((item) => [item.id, item])),
      );
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar tags';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => tags.some((tag) => tag.id === id)));
  }, [tags]);

  const resetForm = () => {
    setName('');
    setBackground(DEFAULT_BACKGROUND);
    setText(DEFAULT_TEXT);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setStatus('Informe o nome da tag.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/dialogs/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          color_background: background,
          color_text: text,
        }),
      });
      resetForm();
      await loadTags();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao criar tag';
      setStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (item: TagItem) => {
    try {
      await apiFetch(`/dialogs/tags/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name,
          color_background: item.color_background,
          color_text: item.color_text,
          sort_order: item.sort_order,
        }),
      });
      await loadTags();
      setStatus('Tag atualizada.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar tag';
      setStatus(message);
    }
  };

  const parseUsage = (message: string): TagUsage | null => {
    try {
      const parsed = JSON.parse(message) as { usage?: TagUsage };
      return parsed.usage ?? null;
    } catch {
      return null;
    }
  };

  const isNotFound = (message: string) => message.toLowerCase().includes('tag not found');

  const handleDelete = async (item: TagItem, force = false): Promise<boolean> => {
    try {
      await apiFetch(`/dialogs/tags/${item.id}?force=${force ? 'true' : 'false'}`, {
        method: 'DELETE',
      });
      setDeleteWarning(null);
      await loadTags();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir tag';
      if (isNotFound(message)) {
        await loadTags();
        return true;
      }
      const usage = parseUsage(message);
      if (usage && !force) {
        setDeleteWarning({ item, usage });
        return false;
      }
      setStatus(message);
      return false;
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      return;
    }
    const next = [...tags];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    const reordered = next.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setTags(reordered);
    setDragIndex(null);

    for (const item of reordered) {
      try {
        await apiFetch(`/dialogs/tags/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify({ sort_order: item.sort_order }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao reordenar tags';
        setStatus(message);
        break;
      }
    }
  };

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => a.sort_order - b.sort_order);
  }, [tags]);

  const allSelected = sortedTags.length > 0 && selectedIds.length === sortedTags.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(sortedTags.map((tag) => tag.id));
  };

  const toggleSelect = (tagId: string) => {
    setSelectedIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    if (!window.confirm(`Deseja excluir ${selectedIds.length} tags selecionadas?`)) {
      return;
    }
    const itemsById = new Map(sortedTags.map((item) => [item.id, item]));
    const results = await Promise.allSettled(
      selectedIds.map((itemId) => apiFetch(`/dialogs/tags/${itemId}?force=false`, { method: 'DELETE' })),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        if (isNotFound(message)) {
          continue;
        }
        const usage = parseUsage(message);
        if (usage) {
          const item = itemsById.get(selectedIds[index]);
          if (item) {
            setDeleteWarning({ item, usage });
            return;
          }
        }
      }
    }

    const failed = results.filter((result) => {
      if (result.status !== 'rejected') {
        return false;
      }
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      return !isNotFound(message);
    });
    if (failed.length > 0) {
      setStatus('Falha ao excluir algumas tags.');
    }

    await loadTags();
    setSelectedIds([]);
  };

  const resetToDefaults = (itemId: string) => {
    setTags((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, color_background: DEFAULT_BACKGROUND, color_text: DEFAULT_TEXT }
          : item,
      ),
    );
  };

  const revertChanges = (itemId: string) => {
    const original = originalTags[itemId];
    if (!original) {
      return;
    }
    setTags((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...original } : item)),
    );
  };

  return (
    <PageShell title="Dialogos" subtitle="Tags">
      <DialogsShell />

      {status && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nova tag</CardTitle>
          <CardDescription>Crie tags para organizar contatos e campanhas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr,160px,160px]">
            <input
              className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              placeholder="Nome da tag"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Fundo
              <input
                type="color"
                value={background}
                onChange={(event) => setBackground(event.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Texto
              <input type="color" value={text} onChange={(event) => setText(event.target.value)} />
            </label>
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar tag'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Tags cadastradas</CardTitle>
              <CardDescription>Arraste para reordenar e clique para editar.</CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <Button size="sm" variant="secondary" onClick={handleBulkDelete}>
                Excluir selecionados
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando tags...</p>
          ) : sortedTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
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
                    <th className="pb-2">Ordem</th>
                    <th className="pb-2">Tag</th>
                    <th className="pb-2">Preview</th>
                    <th className="pb-2">Fundo</th>
                    <th className="pb-2">Texto</th>
                    <th className="pb-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTags.map((item, index) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(index)}
                      className={cn(
                        'border-t border-border/40',
                        dragIndex === index ? 'bg-muted/40' : '',
                      )}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Selecionar ${item.name}`}
                        />
                      </td>
                      <td className="py-2">{item.sort_order}</td>
                      <td className="py-2">
                        <input
                          className="w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-xs"
                          value={item.name}
                          onChange={(event) =>
                            setTags((prev) =>
                              prev.map((tag) =>
                                tag.id === item.id ? { ...tag, name: event.target.value } : tag,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] font-semibold"
                          style={{
                            backgroundColor: item.color_background || DEFAULT_BACKGROUND,
                            color: item.color_text || DEFAULT_TEXT,
                          }}
                        >
                          {item.name}
                        </span>
                      </td>
                      <td className="py-2">
                        <input
                          type="color"
                          value={item.color_background}
                          onChange={(event) =>
                            setTags((prev) =>
                              prev.map((tag) =>
                                tag.id === item.id
                                  ? { ...tag, color_background: event.target.value }
                                  : tag,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <input
                          type="color"
                          value={item.color_text}
                          onChange={(event) =>
                            setTags((prev) =>
                              prev.map((tag) =>
                                tag.id === item.id
                                  ? { ...tag, color_text: event.target.value }
                                  : tag,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleUpdate(item)}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => resetToDefaults(item.id)}>
                            Padrao
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => revertChanges(item.id)}>
                            Desfazer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
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

      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => setDeleteWarning(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Tag em uso</h3>
            <p className="mt-2 text-sm text-muted-foreground">Esta tag esta sendo usada em:</p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>- {deleteWarning.usage.contacts} contatos</li>
              <li>- {deleteWarning.usage.conversations} conversas</li>
              <li>- {deleteWarning.usage.campaigns} campanhas</li>
              <li>- {deleteWarning.usage.automations} automacoes</li>
              <li>- {deleteWarning.usage.dialogs} dialogos</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Remover pode afetar o sistema. Deseja continuar?
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDeleteWarning(null)}>
                Cancelar
              </Button>
              <Button onClick={() => handleDelete(deleteWarning.item, true)}>Excluir assim mesmo</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
