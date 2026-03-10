"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicConfig = getPublicConfig;
/**
 * Next.js só garante NEXT_PUBLIC_* no bundle quando o acesso é estático
 * no próprio app. Em packages compartilhados, process.env pode virar undefined no client.
 * Então tentamos múltiplas fontes com fallback seguro.
 */
function readPublic(key) {
    // 1) Browser global injection (se existir)
    const g = globalThis;
    const injected = g?.__SAMACHAT_PUBLIC_CONFIG__?.[key];
    if (typeof injected === 'string' && injected.length > 0)
        return injected;
    // 2) Next server / Node
    const pe = (typeof process !== 'undefined' ? process.env : undefined);
    const fromProcess = pe?.[key];
    if (typeof fromProcess === 'string' && fromProcess.length > 0)
        return fromProcess;
    // 3) Nothing found
    return undefined;
}
const DEFAULTS = {
    apiUrl: 'http://localhost:3001',
    termsVersion: '2026-02-22',
    privacyVersion: '2026-02-22',
    supabaseUrl: '',
    supabaseAnonKey: '',
};
function getPublicConfig() {
    const apiUrl = readPublic('NEXT_PUBLIC_API_URL') || DEFAULTS.apiUrl;
    const termsVersion = readPublic('NEXT_PUBLIC_TERMS_VERSION') || DEFAULTS.termsVersion;
    const privacyVersion = readPublic('NEXT_PUBLIC_PRIVACY_VERSION') || DEFAULTS.privacyVersion;
    const supabaseUrl = readPublic('NEXT_PUBLIC_SUPABASE_URL') || DEFAULTS.supabaseUrl;
    const supabaseAnonKey = readPublic('NEXT_PUBLIC_SUPABASE_ANON_KEY') || DEFAULTS.supabaseAnonKey;
    return {
        apiUrl,
        termsVersion,
        privacyVersion,
        supabase: {
            url: supabaseUrl,
            anonKey: supabaseAnonKey,
        },
    };
}
