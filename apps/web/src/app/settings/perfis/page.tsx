'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getTenantId } from '@/lib/tenant';
import { SettingsShell } from '@/components/settings/SettingsShell';
import { hasPermission } from '@/lib/permissions';
import { usePermissions } from '@/lib/use-permissions';
import { PermissionEditor } from '../usuarios/permission-editor';

interface AccessProfile {
  id: string;
  name: string;
  system_role: string;
  permissions: string[];
}

export default function AccessProfilesPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('agent');
  const [profilePermissions, setProfilePermissions] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const canManageProfiles = hasPermission(permissions, 'users:manage_profiles');
  const canViewProfiles =
    canManageProfiles ||
    hasPermission(permissions, ['users:view', 'users:create', 'users:edit']);

  const loadProfiles = useCallback(async () => {
    const tenantId = getTenantId();
    if (!tenantId) {
      setStatus('Tenant nao selecionado.');
      setLoading(false);
      return;
    }

    if (!canViewProfiles) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<AccessProfile[]>(`/tenants/${tenantId}/access-profiles`);
      setProfiles(data);
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar perfis';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }, [canViewProfiles]);

  useEffect(() => {
    if (permissionsLoading) {
      return;
    }
    void loadProfiles();
  }, [loadProfiles, permissionsLoading]);

  useEffect(() => {
    setSelectedProfileIds((prev) => prev.filter((id) => profiles.some((profile) => profile.id === id)));
  }, [profiles]);

  const resetProfileForm = () => {
    setProfileName('');
    setProfileRole('agent');
    setProfilePermissions([]);
    setEditingProfileId(null);
  };

  const handleSaveProfile = async () => {
    const tenantId = getTenantId();
    if (!tenantId || !profileName.trim()) {
      return;
    }
    if (!canManageProfiles) {
      setStatus('Voce nao possui permissao para gerenciar perfis.');
      return;
    }
    setSavingProfile(true);
    try {
      if (editingProfileId) {
        await apiFetch(`/tenants/${tenantId}/access-profiles/${editingProfileId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: profileName.trim(),
            system_role: profileRole,
            permissions: profilePermissions,
          }),
        });
      } else {
        await apiFetch(`/tenants/${tenantId}/access-profiles`, {
          method: 'POST',
          body: JSON.stringify({
            name: profileName.trim(),
            system_role: profileRole,
            permissions: profilePermissions,
          }),
        });
      }
      resetProfileForm();
      await loadProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar perfil';
      setStatus(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleEditProfile = (profile: AccessProfile) => {
    setEditingProfileId(profile.id);
    setProfileName(profile.name);
    setProfileRole(profile.system_role);
    setProfilePermissions(Array.isArray(profile.permissions) ? profile.permissions : []);
  };

  const handleRemoveProfile = async (profileId: string) => {
    const tenantId = getTenantId();
    if (!tenantId) {
      return;
    }
    if (!canManageProfiles) {
      setStatus('Voce nao possui permissao para gerenciar perfis.');
      return;
    }
    try {
      await apiFetch(`/tenants/${tenantId}/access-profiles/${profileId}`, {
        method: 'DELETE',
      });
      await loadProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao remover perfil';
      setStatus(message);
    }
  };

  const allSelected = profiles.length > 0 && selectedProfileIds.length === profiles.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProfileIds([]);
      return;
    }
    setSelectedProfileIds(profiles.map((profile) => profile.id));
  };

  const toggleSelectProfile = (profileId: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    );
  };

  const handleBulkRemove = async () => {
    if (!canManageProfiles || selectedProfileIds.length === 0) {
      return;
    }
    if (!window.confirm(`Deseja remover ${selectedProfileIds.length} perfis selecionados?`)) {
      return;
    }
    const tenantId = getTenantId();
    if (!tenantId) {
      return;
    }
    const results = await Promise.allSettled(
      selectedProfileIds.map((profileId) =>
        apiFetch(`/tenants/${tenantId}/access-profiles/${profileId}`, { method: 'DELETE' }),
      ),
    );
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      setStatus('Falha ao remover alguns perfis.');
    }
    setProfiles((prev) => prev.filter((profile) => !selectedProfileIds.includes(profile.id)));
    setSelectedProfileIds([]);
  };

  return (
    <PageShell title="Configuracoes" subtitle="Perfis de acesso">
      <SettingsShell />

      {status && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Perfis de acesso</CardTitle>
              <CardDescription>Crie e ajuste hierarquias com permissoes.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {profiles.length > 0 && canManageProfiles && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Selecionar todos os perfis"
                  />
                  Selecionar todos
                </label>
              )}
              {selectedProfileIds.length > 0 && canManageProfiles && (
                <Button size="sm" variant="secondary" onClick={handleBulkRemove}>
                  Remover selecionados
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando perfis...</p>
          ) : !canViewProfiles ? (
            <p className="text-sm text-muted-foreground">
              Voce nao possui permissao para visualizar perfis.
            </p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum perfil cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProfileIds.includes(profile.id)}
                        onChange={() => toggleSelectProfile(profile.id)}
                        aria-label={`Selecionar ${profile.name}`}
                      />
                      <p className="text-sm font-semibold">{profile.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Nivel: {profile.system_role}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEditProfile(profile)}
                      disabled={!canManageProfiles}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRemoveProfile(profile.id)}
                      disabled={!canManageProfiles}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {editingProfileId ? 'Editar perfil' : 'Novo perfil'}
              </p>
              {editingProfileId && (
                <Button size="sm" variant="ghost" onClick={resetProfileForm}>
                  Cancelar edicao
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr,200px]">
              <input
                className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                placeholder="Nome do perfil"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <select
                className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                value={profileRole}
                onChange={(event) => setProfileRole(event.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div className="mt-4">
              <PermissionEditor value={profilePermissions} onChange={setProfilePermissions} />
            </div>
            <Button
              className="mt-4"
              onClick={handleSaveProfile}
              disabled={savingProfile || !canManageProfiles}
            >
              {savingProfile ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
