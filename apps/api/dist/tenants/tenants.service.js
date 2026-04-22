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
const workspaces_service_1 = require("../workspaces/workspaces.service");
const config_1 = require("@samachat/config");
const client_1 = require("@prisma/client");
let TenantsService = class TenantsService {
    prisma;
    workspacesService;
    constructor(prisma, workspacesService) {
        this.prisma = prisma;
        this.workspacesService = workspacesService;
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
        await this.workspacesService.ensureDefaultWorkspace(tenant.id, user, tenant.name);
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
            include: {
                user: true,
                access_profile: true,
                access_profiles: { include: { access_profile: true } },
            },
            orderBy: { created_at: 'asc' },
        });
    }
    async listAccessProfiles(tenantId) {
        const profiles = await this.prisma.accessProfile.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
        if (profiles.length > 0) {
            return profiles;
        }
        return this.seedAccessProfiles(tenantId);
    }
    async createAccessProfile(tenantId, input) {
        return this.prisma.accessProfile.create({
            data: {
                tenant_id: tenantId,
                name: input.name,
                system_role: input.system_role,
                permissions: input.permissions,
            },
        });
    }
    async updateAccessProfile(tenantId, profileId, input) {
        const profile = await this.prisma.accessProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile || profile.tenant_id !== tenantId) {
            throw new Error('PROFILE_NOT_FOUND');
        }
        const nextPermissions = input.permissions ?? profile.permissions;
        return this.prisma.accessProfile.update({
            where: { id: profileId },
            data: {
                name: input.name ?? profile.name,
                system_role: input.system_role ?? profile.system_role,
                permissions: nextPermissions,
            },
        });
    }
    async removeAccessProfile(tenantId, profileId) {
        const profile = await this.prisma.accessProfile.findUnique({
            where: { id: profileId },
        });
        if (!profile || profile.tenant_id !== tenantId) {
            throw new Error('PROFILE_NOT_FOUND');
        }
        const assigned = await this.prisma.membership.count({
            where: { access_profile_id: profileId },
        });
        const assignedExtra = await this.prisma.membershipAccessProfile.count({
            where: { access_profile_id: profileId },
        });
        if (assigned > 0 || assignedExtra > 0) {
            throw new Error('PROFILE_IN_USE');
        }
        return this.prisma.accessProfile.delete({
            where: { id: profileId },
        });
    }
    async listUsers(tenantId) {
        return this.prisma.membership.findMany({
            where: { tenant_id: tenantId },
            include: {
                user: true,
                access_profile: true,
                access_profiles: { include: { access_profile: true } },
            },
            orderBy: { created_at: 'asc' },
        });
    }
    async createUser(tenantId, input) {
        const profileIds = this.normalizeProfileIds(input);
        if (profileIds.length === 0) {
            throw new Error('PROFILE_NOT_FOUND');
        }
        const profiles = await this.prisma.accessProfile.findMany({
            where: { id: { in: profileIds }, tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
        if (profiles.length !== profileIds.length) {
            throw new Error('PROFILE_NOT_FOUND');
        }
        const existingProfile = await this.prisma.userProfile.findUnique({
            where: { email: input.email },
        });
        if (existingProfile) {
            const existingMembership = await this.prisma.membership.findFirst({
                where: { tenant_id: tenantId, user_id: existingProfile.id },
            });
            if (existingMembership) {
                throw new Error('USER_ALREADY_MEMBER');
            }
        }
        let userProfile = existingProfile;
        if (!userProfile) {
            const authUser = await this.createSupabaseUser(input.email, input.password, input.full_name);
            userProfile = await this.prisma.userProfile.create({
                data: {
                    auth_user_id: authUser.id,
                    email: input.email,
                    full_name: input.full_name,
                },
            });
        }
        else if (input.full_name && input.full_name !== userProfile.full_name) {
            userProfile = await this.prisma.userProfile.update({
                where: { id: userProfile.id },
                data: { full_name: input.full_name },
            });
        }
        const primaryProfile = profiles[0];
        if (!primaryProfile) {
            throw new Error('PROFILE_NOT_FOUND');
        }
        const effectiveRole = this.resolveRoleFromProfiles(profiles);
        const membership = await this.prisma.membership.create({
            data: {
                tenant_id: tenantId,
                user_id: userProfile.id,
                role: effectiveRole,
                access_profile_id: primaryProfile.id,
                permissions_override: input.permissions_override ?? client_1.Prisma.DbNull,
            },
        });
        await this.prisma.membershipAccessProfile.createMany({
            data: profiles.map((profile) => ({
                membership_id: membership.id,
                access_profile_id: profile.id,
            })),
            skipDuplicates: true,
        });
        const workspace = await this.ensureTenantWorkspace(tenantId, userProfile.id);
        await this.prisma.workspaceUser.create({
            data: {
                workspace_id: workspace.id,
                user_id: userProfile.id,
                role: effectiveRole === 'admin' ? client_1.WorkspaceRole.admin : client_1.WorkspaceRole.agent,
            },
        });
        return this.prisma.membership.findUnique({
            where: { id: membership.id },
            include: {
                user: true,
                access_profile: true,
                access_profiles: { include: { access_profile: true } },
            },
        });
    }
    async updateUser(tenantId, membershipId, input) {
        const membership = await this.prisma.membership.findUnique({
            where: { id: membershipId },
            include: { user: true, access_profiles: true },
        });
        if (!membership || membership.tenant_id !== tenantId) {
            throw new Error('MEMBERSHIP_NOT_FOUND');
        }
        let nextProfileId = membership.access_profile_id;
        let nextRole = membership.role;
        if (input.access_profile_id || input.access_profile_ids) {
            const profileIds = this.normalizeProfileIds(input);
            const profiles = await this.prisma.accessProfile.findMany({
                where: { id: { in: profileIds }, tenant_id: tenantId },
                orderBy: { created_at: 'asc' },
            });
            if (profiles.length !== profileIds.length) {
                throw new Error('PROFILE_NOT_FOUND');
            }
            const primaryProfile = profiles[0];
            if (!primaryProfile) {
                throw new Error('PROFILE_NOT_FOUND');
            }
            nextProfileId = primaryProfile.id;
            nextRole = this.resolveRoleFromProfiles(profiles);
            await this.prisma.membershipAccessProfile.deleteMany({
                where: { membership_id: membershipId },
            });
            await this.prisma.membershipAccessProfile.createMany({
                data: profiles.map((profile) => ({
                    membership_id: membershipId,
                    access_profile_id: profile.id,
                })),
                skipDuplicates: true,
            });
        }
        if (input.full_name && input.full_name !== membership.user.full_name) {
            await this.prisma.userProfile.update({
                where: { id: membership.user_id },
                data: { full_name: input.full_name },
            });
        }
        let permissionsOverrideData;
        if (typeof input.permissions_override === 'undefined') {
            permissionsOverrideData = undefined;
        }
        else if (input.permissions_override === null) {
            permissionsOverrideData = client_1.Prisma.DbNull;
        }
        else {
            permissionsOverrideData = input.permissions_override;
        }
        return this.prisma.membership.update({
            where: { id: membershipId },
            data: {
                role: nextRole,
                access_profile_id: nextProfileId,
                permissions_override: permissionsOverrideData,
            },
            include: {
                user: true,
                access_profile: true,
                access_profiles: { include: { access_profile: true } },
            },
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
        await this.prisma.workspaceUser.deleteMany({
            where: { user_id: membership.user_id, workspace: { tenant_id: tenantId } },
        });
        return this.prisma.membership.delete({
            where: { id: membershipId },
        });
    }
    async createSupabaseUser(email, password, fullName) {
        const config = (0, config_1.getConfig)();
        const url = `${config.supabase.url}/auth/v1/admin/users`;
        const apiKey = config.supabase.serviceRoleKey;
        if (!url || !apiKey) {
            throw new Error('SUPABASE_ADMIN_CONFIG_MISSING');
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                apikey: apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName },
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'SUPABASE_USER_CREATE_FAILED');
        }
        return response.json();
    }
    async ensureTenantWorkspace(tenantId, userId) {
        const existing = await this.prisma.workspace.findFirst({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
        if (existing) {
            return existing;
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        const name = tenant ? `${tenant.name} Workspace` : 'Workspace';
        return this.prisma.workspace.create({
            data: {
                tenant_id: tenantId,
                name,
                users: {
                    create: {
                        user_id: userId,
                        role: client_1.WorkspaceRole.owner,
                    },
                },
            },
        });
    }
    async seedAccessProfiles(tenantId) {
        const defaults = [
            { name: 'super admin', system_role: client_1.Role.admin, permissions: this.defaultAllPermissions() },
            { name: 'admin', system_role: client_1.Role.admin, permissions: this.defaultAdminPermissions() },
            { name: 'closer', system_role: client_1.Role.agent, permissions: this.defaultAgentPermissions() },
            { name: 'sdr', system_role: client_1.Role.agent, permissions: this.defaultAgentPermissions() },
            { name: 'sdr ativo', system_role: client_1.Role.agent, permissions: this.defaultAgentPermissions() },
            { name: 'cs', system_role: client_1.Role.manager, permissions: this.defaultManagerPermissions() },
            { name: 'pos contemplacao', system_role: client_1.Role.agent, permissions: this.defaultAgentPermissions() },
        ];
        await this.prisma.accessProfile.createMany({
            data: defaults.map((profile) => ({
                tenant_id: tenantId,
                name: profile.name,
                system_role: profile.system_role,
                permissions: profile.permissions,
            })),
            skipDuplicates: true,
        });
        return this.prisma.accessProfile.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
    }
    normalizeProfileIds(input) {
        if (input.access_profile_ids && input.access_profile_ids.length > 0) {
            return input.access_profile_ids;
        }
        if (input.access_profile_id) {
            return [input.access_profile_id];
        }
        return [];
    }
    resolveRoleFromProfiles(profiles) {
        if (profiles.some((profile) => profile.system_role === 'admin')) {
            return client_1.Role.admin;
        }
        if (profiles.length > 1) {
            return client_1.Role.manager;
        }
        return profiles[0]?.system_role ?? client_1.Role.agent;
    }
    defaultAllPermissions() {
        return ['*'];
    }
    defaultAdminPermissions() {
        return ['*'];
    }
    defaultManagerPermissions() {
        return ['chats:view', 'messages:view', 'users:view', 'dialogs:view', 'dialogs:create', 'dialogs:edit'];
    }
    defaultAgentPermissions() {
        return ['chats:view', 'messages:view', 'messages:send', 'dialogs:view'];
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workspaces_service_1.WorkspacesService])
], TenantsService);
