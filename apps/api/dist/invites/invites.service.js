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
exports.InvitesService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../common/prisma/prisma.service");
const tenant_utils_1 = require("../common/tenant/tenant.utils");
const DEFAULT_INVITE_DAYS = 7;
let InvitesService = class InvitesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createInvite(tenantId, input, user) {
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + DEFAULT_INVITE_DAYS * 24 * 60 * 60 * 1000);
        return this.prisma.invite.create({
            data: {
                tenant_id: tenantId,
                email: input.email,
                role: input.role,
                token,
                expires_at: expiresAt,
                created_by_user_id: profile.id,
            },
        });
    }
    async listPendingInvites(email) {
        return this.prisma.invite.findMany({
            where: {
                email,
                accepted_at: null,
                expires_at: { gt: new Date() },
            },
            orderBy: { created_at: 'desc' },
        });
    }
    async acceptInvite(token, user) {
        const invite = await this.prisma.invite.findUnique({
            where: { token },
        });
        if (!invite) {
            throw new Error('INVITE_NOT_FOUND');
        }
        if (invite.accepted_at) {
            return { invite, status: 'already-accepted' };
        }
        if (invite.expires_at.getTime() < Date.now()) {
            throw new Error('INVITE_EXPIRED');
        }
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        const existingMembership = await this.prisma.membership.findFirst({
            where: {
                tenant_id: invite.tenant_id,
                user_id: profile.id,
            },
        });
        if (!existingMembership) {
            await this.prisma.membership.create({
                data: {
                    tenant_id: invite.tenant_id,
                    user_id: profile.id,
                    role: invite.role,
                },
            });
        }
        const updatedInvite = await this.prisma.invite.update({
            where: { token },
            data: { accepted_at: new Date() },
        });
        return { invite: updatedInvite, status: 'accepted' };
    }
};
exports.InvitesService = InvitesService;
exports.InvitesService = InvitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvitesService);
