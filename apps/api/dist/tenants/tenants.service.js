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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tenant_utils_1 = require("../common/tenant/tenant.utils");
let TenantsService = class TenantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTenant(input, user) {
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const tenant = await this.prisma.tenant.create({
            data: {
                name: input.name,
                slug: input.slug,
                memberships: {
                    create: {
                        user_id: profile.id,
                        role: 'admin',
                    },
                },
            },
        });
        return tenant;
    }
    async listTenants(user) {
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const memberships = await this.prisma.membership.findMany({
            where: { user_id: profile.id },
            include: { tenant: true },
            orderBy: { created_at: 'asc' },
        });
        return memberships.map((membership) => ({
            membership,
            tenant: membership.tenant,
        }));
    }
    async listMemberships(tenantId) {
        return this.prisma.membership.findMany({
            where: { tenant_id: tenantId },
            include: { user: true },
            orderBy: { created_at: 'asc' },
        });
    }
    async updateMembershipRole(tenantId, membershipId, input) {
        const membership = await this.prisma.membership.findUnique({
            where: { id: membershipId },
        });
        if (!membership || membership.tenant_id !== tenantId) {
            throw new Error('MEMBERSHIP_NOT_FOUND');
        }
        return this.prisma.membership.update({
            where: { id: membershipId },
            data: { role: input.role },
        });
    }
    async removeMembership(tenantId, membershipId) {
        const membership = await this.prisma.membership.findUnique({
            where: { id: membershipId },
        });
        if (!membership || membership.tenant_id !== tenantId) {
            throw new Error('MEMBERSHIP_NOT_FOUND');
        }
        return this.prisma.membership.delete({
            where: { id: membershipId },
        });
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TenantsService);
