import { createClient } from '@supabase/supabase-js';
import { getPublicConfig } from './public-config';

function resolveGetPublicConfig(): () => ReturnType<typeof getPublicConfig> {
  return getPublicConfig;
}

const publicConfigGetter = resolveGetPublicConfig();
const config = publicConfigGetter();

const missingSupabaseConfig = !config.supabase.url || !config.supabase.anonKey;

function createMissingSupabaseClient() {
  const error = new Error(
    'Supabase public config missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );

  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error }),
      signInWithPassword: async () => ({ data: { session: null, user: null }, error }),
      signOut: async () => ({ error }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } }, error }),
    },
  } as unknown as ReturnType<typeof createClient>;
}

export const supabase = missingSupabaseConfig
  ? createMissingSupabaseClient()
  : createClient(config.supabase.url, config.supabase.anonKey);