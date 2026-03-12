import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'manager', 'agent']);

export const tenantCreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: roleSchema,
  tenant_id: z.string().min(1).optional(),
});

export const legalDocumentTypeSchema = z.enum(['terms', 'privacy']);
export const dataRequestTypeSchema = z.enum(['export', 'delete']);

export const consentCreateSchema = z.object({
  document_id: z.string().min(1),
  accepted_at: z.string().datetime().optional(),
  ip_address: z.string().min(3).optional(),
  user_agent: z.string().min(3).optional(),
});

export const preferenceSchema = z.object({
  theme: z.string().min(2).optional(),
  notifications_enabled: z.boolean().optional(),
});

export const dataRequestSchema = z.object({
  type: dataRequestTypeSchema,
  details: z.record(z.unknown()).optional(),
});

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: roleSchema,
});

export const permissionsSchema = z.array(z.string());

export const accessProfileSchema = z.object({
  name: z.string().min(2),
  system_role: roleSchema,
  permissions: permissionsSchema,
});

export const accessProfileUpdateSchema = accessProfileSchema.partial().extend({
  permissions: permissionsSchema.optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  password: z.string().min(8),
  access_profile_id: z.string().min(1).optional(),
  access_profile_ids: z.array(z.string().min(1)).min(1).optional(),
  permissions_override: permissionsSchema.optional(),
}).refine((value) => value.access_profile_id || value.access_profile_ids?.length, {
  message: 'access_profile_id or access_profile_ids is required',
});

export const userUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  access_profile_id: z.string().min(1).optional(),
  access_profile_ids: z.array(z.string().min(1)).min(1).optional(),
  permissions_override: permissionsSchema.nullable().optional(),
});

export const legalAcceptanceSchema = z.object({
  terms_version: z.string().min(3),
  privacy_version: z.string().min(3),
  accepted_at: z.string().datetime().optional(),
  ip_address: z.string().min(3).optional(),
  user_agent: z.string().min(3).optional(),
});

export const membershipUpdateSchema = z.object({
  role: roleSchema,
});

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
