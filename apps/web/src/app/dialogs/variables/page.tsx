'use client';

import { useCallback, useEffect, useState } from 'react';
import { DialogsShell } from '@/components/dialogs/DialogsShell';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

interface VariableItem {
  id: string;
  name: string;
  placeholder: string;
  description?: string | null;
  created_at: string;
}

interface VariableUsage {
  dialogs: number;
  campaigns: number;
  templates: number;
}

export default function DialogVariablesPage() {
  const [items, setItems] = useState<VariableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<{
    item: VariableItem;
    usage: VariableUsage;
  } | null>(null);

  const loadVariables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<VariableItem[]>('/dialogs/variables');
      setItems(data);
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar variaveis';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVariables();
  }, [loadVariables]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPlaceholder('');
    setDescription('');
  };

  const handleSave = async () => {
    if (!name.trim() || !placeholder.trim()) {
      setStatus('Preencha nome e placeholder.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        placeholder: placeholder.trim(),
        description: description.trim() || null,
      };
      if (editingId) {
        await apiFetch(`/dialogs/variables/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/dialogs/variables', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await loadVariables();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar variavel';
      setStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: VariableItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPlaceholder(item.placeholder);
    setDescription(item.description || '');
  };

  const parseUsage = (message: string): VariableUsage | null => {
    try {
      const parsed = JSON.parse(message) as { usage?: VariableUsage };
      return parsed.usage ?? null;
    } catch {
      return null;
    }
  };

  const handleDelete = async (item: VariableItem, force = false): Promise<boolean> => {
    try {
      await apiFetch(`/dialogs/variables/${item.id}?force=${force ? 'true' : 'false'}`, {
        method: 'DELETE',
      });
      setDeleteWarning(null);
      await loadVariables();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir variavel';
      const usage = parseUsage(message);
      if (usage && !force) {
        setDeleteWarning({ item, usage });
        return false;
      }
      setStatus(message);
      return false;
    }
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item.id));
  };

  const toggleSelect = (itemId: string) => {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    if (!window.confirm(`Deseja excluir ${selectedIds.length} variaveis selecionadas?`)) {
      return;
    }
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const results = await Promise.allSettled(
      selectedIds.map((itemId) =>
        apiFetch(`/dialogs/variables/${itemId}?force=false`, { method: 'DELETE' }),
      ),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
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

    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      setStatus('Falha ao excluir algumas variaveis.');
    }

    await loadVariables();
    setSelectedIds([]);
  };

  return (
    <PageShell title="Dialogos" subtitle="Variaveis">
      <DialogsShell />

      {status && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? 'Editar variavel' : 'Nova variavel'}</CardTitle>
          <CardDescription>Cadastre placeholders reutilizaveis para dialogos e campanhas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
            <input
              className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              placeholder="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
              placeholder="{{name}}"
              value={placeholder}
              onChange={(event) => setPlaceholder(event.target.value)}
            />
          </div>
          <input
            className="w-full rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
            placeholder="Descricao (opcional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Salvar variavel'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Variaveis cadastradas</CardTitle>
              <CardDescription>Use estas variaveis nos seus dialogos.</CardDescription>
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
            <p className="text-sm text-muted-foreground">Carregando variaveis...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma variavel cadastrada.</p>
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
                    <th className="pb-2">Placeholder</th>
                    <th className="pb-2">Descricao</th>
                    <th className="pb-2">Criado em</th>
                    <th className="pb-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-border/40">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Selecionar ${item.name}`}
                        />
                      </td>
                      <td className="py-2 font-semibold">{item.name}</td>
                      <td className="py-2">{item.placeholder}</td>
                      <td className="py-2">{item.description || '-'}</td>
                      <td className="py-2">
                        {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            Editar
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
            <h3 className="text-lg font-semibold">Variavel em uso</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta variavel esta sendo usada em:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>- {deleteWarning.usage.dialogs} dialogos</li>
              <li>- {deleteWarning.usage.templates} templates</li>
              <li>- {deleteWarning.usage.campaigns} campanhas</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Remover pode quebrar mensagens. Deseja continuar?
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
