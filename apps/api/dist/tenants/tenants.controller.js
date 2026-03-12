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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@samachat/shared");
const supabase_auth_guard_1 = require("../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const rbac_guard_1 = require("../common/guards/rbac.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const permissions_decorator_1 = require("../common/decorators/permissions.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const tenants_service_1 = require("./tenants.service");
let TenantsController = class TenantsController {
    tenantsService;
    constructor(tenantsService) {
        this.tenantsService = tenantsService;
    }
    listTenants(req) {
        return this.tenantsService.listTenants(req.user);
    }
    createTenant(body, req) {
        return this.tenantsService.createTenant(body, req.user);
    }
    async listMemberships(tenantId, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        return this.tenantsService.listMemberships(tenantId);
    }
    async listAccessProfiles(tenantId, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        return this.tenantsService.listAccessProfiles(tenantId);
    }
    async createAccessProfile(tenantId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        return this.tenantsService.createAccessProfile(tenantId, body);
    }
    async updateAccessProfile(tenantId, profileId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.updateAccessProfile(tenantId, profileId, body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'PROFILE_NOT_FOUND';
            if (message === 'PROFILE_NOT_FOUND') {
                throw new common_1.BadRequestException('Perfil nao encontrado');
            }
            throw err;
        }
    }
    async removeAccessProfile(tenantId, profileId, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.removeAccessProfile(tenantId, profileId);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'PROFILE_NOT_FOUND';
            if (message === 'PROFILE_IN_USE') {
                throw new common_1.BadRequestException('Perfil em uso por usuarios');
            }
            throw new common_1.BadRequestException('Perfil nao encontrado');
        }
    }
    async listUsers(tenantId, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        return this.tenantsService.listUsers(tenantId);
    }
    async createUser(tenantId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.createUser(tenantId, body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'USER_CREATE_FAILED';
            if (message === 'PROFILE_NOT_FOUND') {
                throw new common_1.BadRequestException('Perfil nao encontrado');
            }
            if (message === 'USER_ALREADY_MEMBER') {
                throw new common_1.BadRequestException('Usuario ja cadastrado no tenant');
            }
            throw new common_1.BadRequestException('Falha ao criar usuario');
        }
    }
    async updateUser(tenantId, membershipId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.updateUser(tenantId, membershipId, body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'USER_UPDATE_FAILED';
            if (message === 'PROFILE_NOT_FOUND') {
                throw new common_1.BadRequestException('Perfil nao encontrado');
            }
            throw new common_1.BadRequestException('Usuario nao encontrado');
        }
    }
    async updateMembershipRole(tenantId, membershipId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.updateMembershipRole(tenantId, membershipId, body);
        }
        catch {
            throw new common_1.BadRequestException('Membership not found');
        }
    }
    async removeMembership(tenantId, membershipId, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        try {
            return await this.tenantsService.removeMembership(tenantId, membershipId);
        }
        catch {
            throw new common_1.BadRequestException('Membership not found');
        }
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "listTenants", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.tenantCreateSchema))),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "createTenant", null);
__decorate([
    (0, common_1.Get)(':tenantId/memberships'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "listMemberships", null);
__decorate([
    (0, common_1.Get)(':tenantId/access-profiles'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, permissions_decorator_1.Permissions)('users:view', 'users:manage_profiles'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "listAccessProfiles", null);
__decorate([
    (0, common_1.Post)(':tenantId/access-profiles'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:manage_profiles'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.accessProfileSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createAccessProfile", null);
__decorate([
    (0, common_1.Patch)(':tenantId/access-profiles/:profileId'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:manage_profiles'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('profileId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.accessProfileUpdateSchema))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateAccessProfile", null);
__decorate([
    (0, common_1.Delete)(':tenantId/access-profiles/:profileId'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:manage_profiles'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('profileId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "removeAccessProfile", null);
__decorate([
    (0, common_1.Get)(':tenantId/users'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, permissions_decorator_1.Permissions)('users:view'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Post)(':tenantId/users'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:create'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.userCreateSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createUser", null);
__decorate([
    (0, common_1.Patch)(':tenantId/users/:membershipId'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:edit'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('membershipId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.userUpdateSchema))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateUser", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Patch)(':tenantId/memberships/:membershipId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('membershipId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.membershipUpdateSchema))),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "updateMembershipRole", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, permissions_decorator_1.Permissions)('users:delete'),
    (0, common_1.Delete)(':tenantId/memberships/:membershipId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Param)('membershipId')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "removeMembership", null);
exports.TenantsController = TenantsController = __decorate([
    (0, common_1.Controller)('tenants'),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService])
], TenantsController);
