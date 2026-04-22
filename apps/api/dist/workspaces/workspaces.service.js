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
exports.WorkspacesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
const tenant_utils_1 = require("../common/tenant/tenant.utils");
let WorkspacesService = class WorkspacesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listWorkspaces(tenantId, user) {
        const existing = await this.prisma.workspace.findMany({
            where: { tenant_id: tenantId },
            include: { users: true },
            orderBy: { created_at: 'asc' },
        });
        if (existing.length > 0) {
            return existing;
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (tenant) {
            await this.ensureDefaultWorkspace(tenantId, user, tenant.name);
        }
        return this.prisma.workspace.findMany({
            where: { tenant_id: tenantId },
            include: { users: true },
            orderBy: { created_at: 'asc' },
        });
    }
    async renameWorkspace(tenantId, workspaceId, name) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace || workspace.tenant_id !== tenantId) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { name },
        });
    }
    async listWorkspaceUsers(tenantId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace || workspace.tenant_id !== tenantId) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        return this.prisma.workspaceUser.findMany({
            where: { workspace_id: workspaceId },
            include: { user: true },
            orderBy: { created_at: 'asc' },
        });
    }
    async addWorkspaceUser(params) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: params.workspaceId },
        });
        if (!workspace || workspace.tenant_id !== params.tenantId) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        const userProfile = await this.prisma.userProfile.findUnique({
            where: { email: params.userEmail },
        });
        if (!userProfile) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.prisma.workspaceUser.create({
            data: {
                workspace_id: params.workspaceId,
                user_id: userProfile.id,
                role: params.role,
            },
        });
    }
    async removeWorkspaceUser(tenantId, workspaceId, workspaceUserId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace || workspace.tenant_id !== tenantId) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        return this.prisma.workspaceUser.delete({
            where: { id: workspaceUserId },
        });
    }
    async ensureDefaultWorkspace(tenantId, user, tenantName) {
        const existing = await this.prisma.workspace.findFirst({
            where: { tenant_id: tenantId },
        });
        if (existing) {
            return existing;
        }
        const profile = await (0, tenant_utils_1.ensureUserProfile)(this.prisma, user);
        return this.prisma.workspace.create({
            data: {
                tenant_id: tenantId,
                name: `${tenantName} Workspace`,
                users: {
                    create: {
                        user_id: profile.id,
                        role: client_1.WorkspaceRole.owner,
                    },
                },
            },
        });
    }
};
exports.WorkspacesService = WorkspacesService;
exports.WorkspacesService = WorkspacesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkspacesService);
