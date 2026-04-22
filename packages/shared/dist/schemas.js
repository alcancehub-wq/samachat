"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipUpdateSchema = exports.legalAcceptanceSchema = exports.userUpdateSchema = exports.userCreateSchema = exports.accessProfileUpdateSchema = exports.accessProfileSchema = exports.permissionsSchema = exports.inviteCreateSchema = exports.dataRequestSchema = exports.preferenceSchema = exports.consentCreateSchema = exports.dataRequestTypeSchema = exports.legalDocumentTypeSchema = exports.authUserSchema = exports.tenantCreateSchema = exports.roleSchema = void 0;
const zod_1 = require("zod");
exports.roleSchema = zod_1.z.enum(['admin', 'manager', 'agent']);
exports.tenantCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/),
});
exports.authUserSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    role: exports.roleSchema,
    tenant_id: zod_1.z.string().min(1).optional(),
});
exports.legalDocumentTypeSchema = zod_1.z.enum(['terms', 'privacy']);
exports.dataRequestTypeSchema = zod_1.z.enum(['export', 'delete']);
exports.consentCreateSchema = zod_1.z.object({
    document_id: zod_1.z.string().min(1),
    accepted_at: zod_1.z.string().datetime().optional(),
    ip_address: zod_1.z.string().min(3).optional(),
    user_agent: zod_1.z.string().min(3).optional(),
});
exports.preferenceSchema = zod_1.z.object({
    theme: zod_1.z.string().min(2).optional(),
    notifications_enabled: zod_1.z.boolean().optional(),
});
exports.dataRequestSchema = zod_1.z.object({
    type: exports.dataRequestTypeSchema,
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.inviteCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: exports.roleSchema,
});
exports.permissionsSchema = zod_1.z.array(zod_1.z.string());
exports.accessProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    system_role: exports.roleSchema,
    permissions: exports.permissionsSchema,
});
exports.accessProfileUpdateSchema = exports.accessProfileSchema.partial().extend({
    permissions: exports.permissionsSchema.optional(),
});
exports.userCreateSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    full_name: zod_1.z.string().min(2),
    password: zod_1.z.string().min(8),
    access_profile_id: zod_1.z.string().min(1).optional(),
    access_profile_ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).optional(),
    permissions_override: exports.permissionsSchema.optional(),
}).refine((value) => value.access_profile_id || value.access_profile_ids?.length, {
    message: 'access_profile_id or access_profile_ids is required',
});
exports.userUpdateSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(2).optional(),
    access_profile_id: zod_1.z.string().min(1).optional(),
    access_profile_ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).optional(),
    permissions_override: exports.permissionsSchema.nullable().optional(),
});
exports.legalAcceptanceSchema = zod_1.z.object({
    terms_version: zod_1.z.string().min(3),
    privacy_version: zod_1.z.string().min(3),
    accepted_at: zod_1.z.string().datetime().optional(),
    ip_address: zod_1.z.string().min(3).optional(),
    user_agent: zod_1.z.string().min(3).optional(),
});
exports.membershipUpdateSchema = zod_1.z.object({
    role: exports.roleSchema,
});
