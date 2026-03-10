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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tenant_utils_1 = require("../tenant/tenant.utils");
let TenantGuard = class TenantGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Missing authenticated user');
        }
        // Cast para acessar headers sem brigar com o tipo TenantRequestContext
        const headers = request.headers;
        const headerTenant = headers?.['x-tenant-id'];
        const paramTenant = request?.params?.tenantId;
        const headerTenantId = typeof headerTenant === 'string' ? headerTenant : undefined;
        const paramTenantId = typeof paramTenant === 'string' ? paramTenant : undefined;
        if (headerTenantId && paramTenantId && headerTenantId !== paramTenantId) {
            throw new common_1.ForbiddenException('Tenant context mismatch');
        }
        const tenantId = headerTenantId || paramTenantId;
        if (!tenantId) {
            throw new common_1.ForbiddenException('Missing tenant context');
        }
        try {
            const { membership, profile } = await (0, tenant_utils_1.requireMembership)(this.prisma, user, tenantId);
            request.tenantId = tenantId;
            request.membership = membership;
            request.userProfile = profile;
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Forbidden';
            if (message === 'MEMBERSHIP_REQUIRED') {
                throw new common_1.ForbiddenException('Membership required for tenant');
            }
            throw new common_1.ForbiddenException('Access denied');
        }
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantGuard);
