"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membershipUpdateSchema = exports.legalAcceptanceSchema = exports.inviteCreateSchema = exports.dataRequestSchema = exports.preferenceSchema = exports.consentCreateSchema = exports.dataRequestTypeSchema = exports.legalDocumentTypeSchema = exports.authUserSchema = exports.tenantCreateSchema = exports.roleSchema = void 0;
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
