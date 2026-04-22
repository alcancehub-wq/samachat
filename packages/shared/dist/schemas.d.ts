import { z } from 'zod';
export declare const roleSchema: z.ZodEnum<["admin", "manager", "agent"]>;
export declare const tenantCreateSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export declare const authUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    role: z.ZodEnum<["admin", "manager", "agent"]>;
    tenant_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    role: "admin" | "manager" | "agent";
    tenant_id?: string | undefined;
}, {
    id: string;
    email: string;
    role: "admin" | "manager" | "agent";
    tenant_id?: string | undefined;
}>;
export declare const legalDocumentTypeSchema: z.ZodEnum<["terms", "privacy"]>;
export declare const dataRequestTypeSchema: z.ZodEnum<["export", "delete"]>;
export declare const consentCreateSchema: z.ZodObject<{
    document_id: z.ZodString;
    accepted_at: z.ZodOptional<z.ZodString>;
    ip_address: z.ZodOptional<z.ZodString>;
    user_agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    document_id: string;
    accepted_at?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
}, {
    document_id: string;
    accepted_at?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
}>;
export declare const preferenceSchema: z.ZodObject<{
    theme: z.ZodOptional<z.ZodString>;
    notifications_enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    theme?: string | undefined;
    notifications_enabled?: boolean | undefined;
}, {
    theme?: string | undefined;
    notifications_enabled?: boolean | undefined;
}>;
export declare const dataRequestSchema: z.ZodObject<{
    type: z.ZodEnum<["export", "delete"]>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "export" | "delete";
    details?: Record<string, unknown> | undefined;
}, {
    type: "export" | "delete";
    details?: Record<string, unknown> | undefined;
}>;
export declare const inviteCreateSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["admin", "manager", "agent"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "admin" | "manager" | "agent";
}, {
    email: string;
    role: "admin" | "manager" | "agent";
}>;
export declare const permissionsSchema: z.ZodArray<z.ZodString, "many">;
export declare const accessProfileSchema: z.ZodObject<{
    name: z.ZodString;
    system_role: z.ZodEnum<["admin", "manager", "agent"]>;
    permissions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    system_role: "admin" | "manager" | "agent";
    permissions: string[];
}, {
    name: string;
    system_role: "admin" | "manager" | "agent";
    permissions: string[];
}>;
export declare const accessProfileUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    system_role: z.ZodOptional<z.ZodEnum<["admin", "manager", "agent"]>>;
} & {
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    system_role?: "admin" | "manager" | "agent" | undefined;
    permissions?: string[] | undefined;
}, {
    name?: string | undefined;
    system_role?: "admin" | "manager" | "agent" | undefined;
    permissions?: string[] | undefined;
}>;
export declare const userCreateSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodString;
    full_name: z.ZodString;
    password: z.ZodString;
    access_profile_id: z.ZodOptional<z.ZodString>;
    access_profile_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    permissions_override: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    email: string;
    full_name: string;
    password: string;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | undefined;
}, {
    email: string;
    full_name: string;
    password: string;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | undefined;
}>, {
    email: string;
    full_name: string;
    password: string;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | undefined;
}, {
    email: string;
    full_name: string;
    password: string;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | undefined;
}>;
export declare const userUpdateSchema: z.ZodObject<{
    full_name: z.ZodOptional<z.ZodString>;
    access_profile_id: z.ZodOptional<z.ZodString>;
    access_profile_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    permissions_override: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    full_name?: string | undefined;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | null | undefined;
}, {
    full_name?: string | undefined;
    access_profile_id?: string | undefined;
    access_profile_ids?: string[] | undefined;
    permissions_override?: string[] | null | undefined;
}>;
export declare const legalAcceptanceSchema: z.ZodObject<{
    terms_version: z.ZodString;
    privacy_version: z.ZodString;
    accepted_at: z.ZodOptional<z.ZodString>;
    ip_address: z.ZodOptional<z.ZodString>;
    user_agent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    terms_version: string;
    privacy_version: string;
    accepted_at?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
}, {
    terms_version: string;
    privacy_version: string;
    accepted_at?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
}>;
export declare const membershipUpdateSchema: z.ZodObject<{
    role: z.ZodEnum<["admin", "manager", "agent"]>;
}, "strip", z.ZodTypeAny, {
    role: "admin" | "manager" | "agent";
}, {
    role: "admin" | "manager" | "agent";
}>;
export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type ConsentCreateInput = z.infer<typeof consentCreateSchema>;
export type PreferenceInput = z.infer<typeof preferenceSchema>;
export type DataRequestInput = z.infer<typeof dataRequestSchema>;
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>;
export type LegalAcceptanceInput = z.infer<typeof legalAcceptanceSchema>;
export type MembershipUpdateInput = z.infer<typeof membershipUpdateSchema>;
export type AccessProfileInput = z.infer<typeof accessProfileSchema>;
export type AccessProfileUpdateInput = z.infer<typeof accessProfileUpdateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
//# sourceMappingURL=schemas.d.ts.map