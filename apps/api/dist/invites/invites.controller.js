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
exports.InvitesController = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@samachat/shared");
const supabase_auth_guard_1 = require("../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const rbac_guard_1 = require("../common/guards/rbac.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
const invites_service_1 = require("./invites.service");
let InvitesController = class InvitesController {
    invitesService;
    constructor(invitesService) {
        this.invitesService = invitesService;
    }
    listPending(req) {
        return this.invitesService.listPendingInvites(req.user.email);
    }
    async createInvite(tenantId, body, req) {
        if (req.tenantId && req.tenantId !== tenantId) {
            throw new common_1.BadRequestException('Tenant context mismatch');
        }
        return this.invitesService.createInvite(tenantId, body, req.user);
    }
    async acceptInvite(token, req) {
        try {
            return await this.invitesService.acceptInvite(token, req.user);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Invite error';
            if (message === 'INVITE_NOT_FOUND') {
                throw new common_1.BadRequestException('Invite not found');
            }
            if (message === 'INVITE_EXPIRED') {
                throw new common_1.BadRequestException('Invite expired');
            }
            throw new common_1.BadRequestException('Invite could not be accepted');
        }
    }
};
exports.InvitesController = InvitesController;
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Get)('invites/pending'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvitesController.prototype, "listPending", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard),
    (0, roles_decorator_1.Roles)('admin', 'manager'),
    (0, common_1.Post)('tenants/:tenantId/invites'),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(shared_1.inviteCreateSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "createInvite", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Post)('invites/:token/accept'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvitesController.prototype, "acceptInvite", null);
exports.InvitesController = InvitesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [invites_service_1.InvitesService])
], InvitesController);
