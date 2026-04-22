export interface PublicConfig {
    apiUrl: string;
    termsVersion: string;
    privacyVersion: string;
    supabase: {
        url: string;
        anonKey: string;
    };
}
export declare function getPublicConfig(): PublicConfig;
//# sourceMappingURL=public.d.ts.map