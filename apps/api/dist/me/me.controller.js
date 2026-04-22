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
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const supabase_auth_guard_1 = require("../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const me_service_1 = require("./me.service");
let MeController = class MeController {
    meService;
    constructor(meService) {
        this.meService = meService;
    }
    async listMemberships(req) {
        return this.meService.listMemberships(req.user);
    }
    async onboardingStatus(req, tenantHeader) {
        const tenantId = typeof tenantHeader === 'string' ? tenantHeader : undefined;
        return this.meService.onboardingStatus(req.user, tenantId);
    }
    async permissions(req) {
        if (!req.tenantId) {
            return { permissions: [] };
        }
        return this.meService.listPermissions(req.user, req.tenantId);
    }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Get)('memberships'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "listMemberships", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Get)('onboarding-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "onboardingStatus", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Get)('permissions'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "permissions", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)('me'),
    __metadata("design:paramtypes", [me_service_1.MeService])
], MeController);
