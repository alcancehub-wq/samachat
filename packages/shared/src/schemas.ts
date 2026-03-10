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
