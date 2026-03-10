"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalController = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@samachat/shared");
const config_1 = require("@samachat/config");
const supabase_auth_guard_1 = require("../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tenant_utils_1 = require("../common/tenant/tenant.utils");
let LegalController = class LegalController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listDocuments() {
        const config = (0, config_1.getConfig)();
        return {
            items: [
                { id: 'terms_current', type: 'terms', version: config.legal.termsVersion, active: true },
                { id: 'privacy_current', type: 'privacy', version: config.legal.privacyVersion, active: true },
            ],
        };
    }
    async acceptLegal(body, req) {
        const config = (0, config_1.getConfig)();
        const profile = req.userProfile ?? (await (0, tenant_utils_1.ensureUserProfile)(this.prisma, req.user));
        const tenantId = req.tenantId;
        if (!tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        if (body.terms_version !== config.legal.termsVersion ||
            body.privacy_version !== config.legal.privacyVersion) {
            throw new common_1.BadRequestException('Legal version mismatch');
        }
        const acceptance = await this.prisma.legalAcceptance.create({
            data: {
                tenant_id: tenantId,
                user_id: profile.id,
                terms_version: config.legal.termsVersion,
                privacy_version: config.legal.privacyVersion,
                accepted_at: body.accepted_at ? new Date(body.accepted_at) : new Date(),
                ip_address: body.ip_address ?? null,
                user_agent: body.user_agent ?? null,
            },
        });
        return { status: 'ok', acceptance };
    }
    createConsent(body, req) {
        return {
            id: 'consent_stub',
            user_id: req.user.id,
            tenant_id: req.tenantId,
            ...body,
            accepted_at: body.accepted_at ?? new Date().toISOString(),
        };
    }
    savePreferences(body, req) {
        return {
            id: 'pref_stub',
            user_id: req.user.id,
            tenant_id: req.tenantId,
            ...body,
        };
    }
    createDataRequest(body, req) {
        return {
            id: 'request_stub',
            user_id: req.user.id,
            tenant_id: req.tenantId,
            status: 'requested',
            ...body,
        };
    }
};
exports.LegalController = LegalController;
__decorate([
    (0, common_1.Get)('documents'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Post)('acceptance'),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.legalAcceptanceSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LegalController.prototype, "acceptLegal", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Post)('consents'),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.consentCreateSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "createConsent", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Post)('preferences'),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.preferenceSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "savePreferences", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Post)('data-requests'),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.dataRequestSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "createDataRequest", null);
exports.LegalController = LegalController = __decorate([
    (0, common_1.Controller)('legal'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LegalController);
