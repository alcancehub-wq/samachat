'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { getTenantId } from '@/lib/tenant';
import { SettingsShell } from '@/components/settings/SettingsShell';
import { hasPermission, normalizePermissions } from '@/lib/permissions';
import { PermissionEditor } from './permission-editor';

interface AccessProfile {
  id: string;
  name: string;
  system_role: string;
  permissions: string[];
}

interface UserMembership {
  id: string;
  role: string;
  access_profile_id?: string | null;
  access_profiles?: Array<{ access_profile: AccessProfile }>;
  permissions_override?: string[] | null;
  user: {
    id: string;
    email: string;
    full_name?: string | null;
  };
  access_profile?: AccessProfile | null;
}

export default function UsersSettingsPage() {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [members, setMembers] = useState<UserMembership[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userProfileIds, setUserProfileIds] = useState<string[]>([]);
  const [customPermissions, setCustomPermissions] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);

  const [editingUser, setEditingUser] = useState<UserMembership | null>(null);
  const [editingProfileIds, setEditingProfileIds] = useState<string[]>([]);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [editingCustomPermissions, setEditingCustomPermissions] = useState(false);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const tenantId = getTenantId();
    if (!tenantId) {
      setStatus('Tenant nao selecionado.');
      setLoading(false);
      return;
    }

    try {
      const permissionResponse = await apiFetch<{ permissions: string[] }>('/me/permissions');
      const currentPermissions = normalizePermissions(permissionResponse.permissions);
      setPermissions(currentPermissions);

      const canViewProfiles = hasPermission(currentPermissions, [
        'users:view',
        'users:manage_profiles',
        'users:create',
        'users:edit',
      ]);
      const canViewUsers = hasPermission(currentPermissions, 'users:view');

      const [profileData, userData] = await Promise.all([
        canViewProfiles
          ? apiFetch<AccessProfile[]>(`/tenants/${tenantId}/access-profiles`)
          : Promise.resolve([]),
        canViewUsers
          ? apiFetch<UserMembership[]>(`/tenants/${tenantId}/users`)
          : Promise.resolve([]),
      ]);

      setProfiles(profileData);
      setMembers(userData);

      const firstProfile = profileData[0];
      if (firstProfile) {
        setUserProfileIds((prev) => (prev.length > 0 ? prev : [firstProfile.id]));
      }
      setStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar usuarios';
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  const handleCreateUser = async () => {
    const tenantId = getTenantId();
    if (!tenantId || !userEmail.trim() || !userName.trim() || !userPassword.trim()) {
      return;
    }
    if (!canCreateUsers) {
      setStatus('Voce nao possui permissao para cadastrar usuarios.');
      return;
    }
    if (userProfileIds.length === 0) {
      setStatus('Selecione pelo menos um perfil de acesso.');
      return;
    }
    setSavingUser(true);
    try {
      await apiFetch(`/tenants/${tenantId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: userEmail.trim(),
          full_name: userName.trim(),
          password: userPassword,
          access_profile_ids: userProfileIds,
          permissions_override: customPermissions ? userPermissions : undefined,
        }),
      });
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      const firstProfile = profiles[0];
      setUserProfileIds((prev) => (firstProfile ? [firstProfile.id] : prev));
      setCustomPermissions(false);
      setUserPermissions([]);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao criar usuario';
      setStatus(message);
    } finally {
      setSavingUser(false);
    }
  };

  const startEditUser = (member: UserMembership) => {
    setEditingUser(member);
    const profileIds = member.access_profiles?.map((item) => item.access_profile.id) ?? [];
    setEditingProfileIds(profileIds.length > 0 ? profileIds : member.access_profile_id ? [member.access_profile_id] : []);
    const override = Array.isArray(member.permissions_override) ? member.permissions_override : [];
    setEditingCustomPermissions(override.length > 0);
    setEditingPermissions(override);
  };

  const handleSaveUser = async () => {
    if (!editingUser) {
      return;
    }
    const tenantId = getTenantId();
    if (!tenantId) {
      return;
    }
    if (!canEditUsers) {
      setStatus('Voce nao possui permissao para editar usuarios.');
      return;
    }
    if (editingProfileIds.length === 0) {
      setStatus('Selecione pelo menos um perfil de acesso.');
      return;
    }

    const trimmedName = (editingUser.user.full_name ?? '').trim();

    setSavingUserEdit(true);
    try {
      await apiFetch(`/tenants/${tenantId}/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: trimmedName.length >= 2 ? trimmedName : undefined,
          access_profile_ids: editingProfileIds.length > 0 ? editingProfileIds : undefined,
          permissions_override: editingCustomPermissions ? editingPermissions : null,
        }),
      });
      setEditingUser(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar usuario';
      setStatus(message);
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleRemoveUser = async (membershipId: string) => {
    const tenantId = getTenantId();
    if (!tenantId) {
      return;
    }
    if (!canDeleteUsers) {
      setStatus('Voce nao possui permissao para remover usuarios.');
      return;
    }
    try {
      await apiFetch(`/tenants/${tenantId}/memberships/${membershipId}`, {
        method: 'DELETE',
      });
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao remover usuario';
      setStatus(message);
    }
  };

  const profileLabel = (profileId?: string | null) =>
    profiles.find((profile) => profile.id === profileId)?.name || 'Sem perfil';

  const profileLabels = (member: UserMembership) => {
    const extraProfiles = member.access_profiles?.map((item) => item.access_profile) ?? [];
    const allProfiles = extraProfiles.length > 0 ? extraProfiles : member.access_profile ? [member.access_profile] : [];
    if (allProfiles.length === 0 && member.access_profile_id) {
      return profileLabel(member.access_profile_id);
    }
    return allProfiles.map((profile) => profile.name).join(', ') || 'Sem perfil';
  };

  const toggleProfileId = (value: string, next: string[], setter: (values: string[]) => void) => {
    if (next.includes(value)) {
      setter(next.filter((item) => item !== value));
      return;
    }
    setter([...next, value]);
  };

  const formatProfileSelection = (selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      return 'Selecionar perfis';
    }
    const names = selectedIds
      .map((id) => profiles.find((profile) => profile.id === id)?.name)
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(', ') : 'Selecionar perfis';
  };

  const canViewUsers = hasPermission(permissions, 'users:view');
  const canCreateUsers = hasPermission(permissions, 'users:create');
  const canEditUsers = hasPermission(permissions, 'users:edit');
  const canDeleteUsers = hasPermission(permissions, 'users:delete');

  return (
    <PageShell title="Configuracoes" subtitle="Usuarios">
      <SettingsShell />

      {status && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-xs">
          {status}
        </div>
      )}

      {loading ? (
        <Card className="rounded-2xl border border-border/60 p-6 text-sm text-muted-foreground">
          Carregando usuarios...
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de usuarios</CardTitle>
              <CardDescription>Cadastre novos usuarios e gerencie permissoes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <p className="text-sm font-semibold">Novo usuario</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                    placeholder="Nome completo"
                    value={userName}
                    onChange={(event) => setUserName(event.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                    placeholder="email@empresa.com"
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                  />
                  <input
                    className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                    placeholder="Senha inicial"
                    type="password"
                    value={userPassword}
                    onChange={(event) => setUserPassword(event.target.value)}
                  />
                  <details className="relative rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                    <summary className="cursor-pointer list-none text-xs font-semibold">
                      Perfis de acesso
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatProfileSelection(userProfileIds)}
                      </span>
                    </summary>
                    <div className="absolute left-0 right-0 z-10 mt-2 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg">
                      <div className="grid gap-2">
                        {profiles.map((profile) => (
                          <label key={profile.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={userProfileIds.includes(profile.id)}
                              onChange={() =>
                                toggleProfileId(profile.id, userProfileIds, setUserProfileIds)
                              }
                            />
                            {profile.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={customPermissions}
                    onChange={(event) => setCustomPermissions(event.target.checked)}
                    disabled={!canCreateUsers}
                  />
                  Personalizar permissoes deste usuario
                </label>
                {customPermissions && (
                  <div className="mt-3">
                    <PermissionEditor value={userPermissions} onChange={setUserPermissions} />
                  </div>
                )}

                <Button
                  className="mt-4"
                  onClick={handleCreateUser}
                  disabled={savingUser || !canCreateUsers}
                >
                  {savingUser ? 'Cadastrando...' : 'Cadastrar usuario'}
                </Button>
              </div>

              {!canViewUsers ? (
                <p className="text-sm text-muted-foreground">
                  Voce nao possui permissao para visualizar usuarios.
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {member.user.full_name || member.user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Perfis: {profileLabels(member)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/60 px-2 py-1 text-[0.65rem]">
                          {member.role}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditUser(member)}
                          disabled={!canEditUsers}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRemoveUser(member.id)}
                          disabled={!canDeleteUsers}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {editingUser && canEditUsers && (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle>Editar usuario</CardTitle>
                <CardDescription>
                  Ajuste perfil e permissoes para {editingUser.user.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Perfis atuais: {profileLabels(editingUser)}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm"
                    value={editingUser.user.full_name ?? ''}
                    onChange={(event) =>
                      setEditingUser({
                        ...editingUser,
                        user: { ...editingUser.user, full_name: event.target.value },
                      })
                    }
                    placeholder="Nome completo"
                  />
                  <details className="relative rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm">
                    <summary className="cursor-pointer list-none text-xs font-semibold">
                      Perfis de acesso
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatProfileSelection(editingProfileIds)}
                      </span>
                    </summary>
                    <div className="absolute left-0 right-0 z-10 mt-2 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg">
                      <div className="grid gap-2">
                        {profiles.map((profile) => (
                          <label key={profile.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={editingProfileIds.includes(profile.id)}
                              onChange={() =>
                                toggleProfileId(profile.id, editingProfileIds, setEditingProfileIds)
                              }
                            />
                            {profile.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={editingCustomPermissions}
                    onChange={(event) => setEditingCustomPermissions(event.target.checked)}
                  />
                  Personalizar permissoes
                </label>
                {editingCustomPermissions && (
                  <PermissionEditor value={editingPermissions} onChange={setEditingPermissions} />
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveUser} disabled={savingUserEdit}>
                    {savingUserEdit ? 'Salvando...' : 'Salvar alteracoes'}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingUser(null)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageShell>
  );
}
