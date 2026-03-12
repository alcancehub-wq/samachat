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
exports.MeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tenant_utils_1 = require("../common/tenant/tenant.utils");
const config_1 = require("@samachat/config");
const permissions_utils_1 = require("../common/permissions/permissions.utils");
let MeService = class MeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listMemberships(user) {
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
    async onboardingStatus(user, tenantId) {
        const config = (0, config_1.getConfig)();
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const memberships = await this.prisma.membership.findMany({
            where: { user_id: profile.id },
            include: { tenant: true },
            orderBy: { created_at: 'asc' },
        });
        const activeTenantId = tenantId || memberships[0]?.tenant_id || null;
        const pendingInvites = await this.prisma.invite.count({
            where: {
                email: profile.email,
                accepted_at: null,
                expires_at: { gt: new Date() },
            },
        });
        const acceptance = await this.prisma.legalAcceptance.findFirst({
            where: {
                user_id: profile.id,
                terms_version: config.legal.termsVersion,
                privacy_version: config.legal.privacyVersion,
            },
            orderBy: { accepted_at: 'desc' },
        });
        const legalAccepted = Boolean(acceptance);
        return {
            hasMembership: memberships.length > 0,
            pendingInvites,
            legalAccepted,
            activeTenantId,
        };
    }
    async listPermissions(user, tenantId) {
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const membership = await this.prisma.membership.findFirst({
            where: { tenant_id: tenantId, user_id: profile.id },
            include: {
                access_profile: true,
                access_profiles: { include: { access_profile: true } },
            },
        });
        const permissions = (0, permissions_utils_1.getEffectivePermissions)(membership ?? undefined);
        return { permissions };
    }
};
exports.MeService = MeService;
exports.MeService = MeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeService);
