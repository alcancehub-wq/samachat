import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';
import type { RequestUser } from '../common/interfaces/request-user';
import { ensureUserProfile } from '../common/tenant/tenant.utils';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces(tenantId: string) {
    return this.prisma.workspace.findMany({
      where: { tenant_id: tenantId },
      include: { users: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async renameWorkspace(tenantId: string, workspaceId: string, name: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.tenant_id !== tenantId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
  }

  async listWorkspaceUsers(tenantId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.tenant_id !== tenantId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceUser.findMany({
      where: { workspace_id: workspaceId },
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async addWorkspaceUser(params: {
    tenantId: string;
    workspaceId: string;
    userEmail: string;
    role: WorkspaceRole;
  }) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: params.workspaceId },
    });

    if (!workspace || workspace.tenant_id !== params.tenantId) {
      throw new NotFoundException('Workspace not found');
    }

    const userProfile = await this.prisma.userProfile.findUnique({
      where: { email: params.userEmail },
    });

    if (!userProfile) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.workspaceUser.create({
      data: {
        workspace_id: params.workspaceId,
        user_id: userProfile.id,
        role: params.role,
      },
    });
  }

  async removeWorkspaceUser(tenantId: string, workspaceId: string, workspaceUserId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.tenant_id !== tenantId) {
      throw new NotFoundException('Workspace not found');
    }

    return this.prisma.workspaceUser.delete({
      where: { id: workspaceUserId },
    });
  }

  async ensureDefaultWorkspace(tenantId: string, user: RequestUser, tenantName: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: { tenant_id: tenantId },
    });

    if (existing) {
      return existing;
    }

    const profile = await ensureUserProfile(this.prisma, user);

    return this.prisma.workspace.create({
      data: {
        tenant_id: tenantId,
        name: `${tenantName} Workspace`,
        users: {
          create: {
            user_id: profile.id,
            role: WorkspaceRole.owner,
          },
        },
      },
    });
  }
}
