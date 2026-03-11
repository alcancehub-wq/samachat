import { supabase } from './supabase';
import { getPublicConfig } from './public-config';
import { getTenantId } from './tenant';

interface ApiError extends Error {
  status?: number;
}

const API_TIMEOUT_MS = 20000;

function resolveGetPublicConfig(): () => ReturnType<typeof getPublicConfig> {
  return getPublicConfig;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  overrideTenantId?: string | null,
): Promise<T> {
  const publicConfigGetter = resolveGetPublicConfig();
  const config = publicConfigGetter();

  const token = await getAuthToken();
  const tenantId = overrideTenantId ?? getTenantId();

  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  const mergedSignal = options.signal;
  if (mergedSignal) {
    mergedSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Tempo limite ao conectar na API'
        : error instanceof Error
          ? error.message
          : 'Falha de conexao com API';
    throw new Error(message);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const error: ApiError = new Error(errorText || 'API request failed');
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}