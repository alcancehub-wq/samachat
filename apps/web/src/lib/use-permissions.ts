'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api';
import { getTenantId, setTenantId } from './tenant';
import { supabase } from './supabase';
import { normalizePermissions } from './permissions';

interface PermissionsState {
  permissions: string[];
  loading: boolean;
  error: string | null;
}

let cachedState: PermissionsState | null = null;
let inflight: Promise<PermissionsState> | null = null;
let cachedTenantId: string | null = null;

function resetCache() {
  cachedState = null;
  cachedTenantId = null;
  inflight = null;
}

async function fetchPermissions(allowTenantSwitch = true): Promise<PermissionsState> {
  const tenantId = getTenantId();
  if (!tenantId) {
    return { permissions: [], loading: false, error: 'Tenant nao selecionado' };
  }

  if (cachedState && cachedTenantId === tenantId) {
    return cachedState;
  }

  if (inflight) {
    return inflight;
  }

  inflight = apiFetch<{ permissions: string[] }>('/me/permissions')
    .then(async (response) => {
      const normalized = normalizePermissions(response.permissions);
      if (normalized.length === 0 && allowTenantSwitch) {
        try {
          const memberships = await apiFetch<
            Array<{ membership: { tenant_id: string } }>
          >('/me/memberships');
          const firstTenant = memberships[0]?.membership?.tenant_id;
          if (firstTenant && firstTenant !== tenantId) {
            setTenantId(firstTenant);
            resetCache();
            return fetchPermissions(false);
          }
        } catch {
          // ignore membership probe errors
        }
      }
      const next = {
        permissions: normalized,
        loading: false,
        error: null,
      };
      cachedState = next;
      cachedTenantId = tenantId;
      return next;
    })
    .catch(async (err) => {
      if (allowTenantSwitch) {
        try {
          const memberships = await apiFetch<
            Array<{ membership: { tenant_id: string } }>
          >('/me/memberships');
          const firstTenant = memberships[0]?.membership?.tenant_id;
          if (firstTenant && firstTenant !== tenantId) {
            setTenantId(firstTenant);
            resetCache();
            return fetchPermissions(false);
          }
        } catch {
          // ignore membership probe errors
        }
      }
      const message = err instanceof Error ? err.message : 'Falha ao carregar permissoes';
      return { permissions: [], loading: false, error: message };
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function usePermissions(): PermissionsState {
  const [tenantId, setTenantIdState] = useState<string | null>(getTenantId());
  const [state, setState] = useState<PermissionsState>({
    permissions: cachedState?.permissions ?? [],
    loading: cachedState ? cachedState.loading : true,
    error: cachedState?.error ?? null,
  });

  const load = useCallback(async () => {
    const next = await fetchPermissions();
    setState(next);
  }, []);

  useEffect(() => {
    resetCache();
    void load();
  }, [load, tenantId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getTenantId();
      setTenantIdState((prev) => (prev === current ? prev : current));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      resetCache();
      void load();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [load]);

  return state;
}
