export interface PublicConfig {
  apiUrl: string;
  termsVersion: string;
  privacyVersion: string;
  supabase: {
    url: string;
    anonKey: string;
  };
}

function readPublic(key: string): string | undefined {
  const g = globalThis as typeof globalThis & {
    __SAMACHAT_PUBLIC_CONFIG__?: Record<string, string | undefined>;
  };
  const injected = g.__SAMACHAT_PUBLIC_CONFIG__?.[key];
  if (typeof injected === 'string' && injected.length > 0) return injected;

  const pe = typeof process !== 'undefined' ? process.env : undefined;
  const fromProcess = pe?.[key];
  if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess;

  return undefined;
}

export function getPublicConfig(): PublicConfig {
  return {
    apiUrl: readPublic('NEXT_PUBLIC_API_URL') || 'http://localhost:3001',
    termsVersion: readPublic('NEXT_PUBLIC_TERMS_VERSION') || '2026-02-22',
    privacyVersion: readPublic('NEXT_PUBLIC_PRIVACY_VERSION') || '2026-02-22',
    supabase: {
      url: readPublic('NEXT_PUBLIC_SUPABASE_URL') || '',
      anonKey: readPublic('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '',
    },
  };
}
