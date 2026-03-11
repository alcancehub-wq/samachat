import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { RequestUser } from '../common/interfaces/request-user';
import { ensureUserProfile } from '../common/tenant/tenant.utils';
import type { MembershipUpdateInput, TenantCreateInput } from '@samachat/shared';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async createTenant(input: TenantCreateInput, user: RequestUser) {
    const profile = await ensureUserProfile(this.prisma, user);

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

  async listTenants(user: RequestUser) {
    const profile = await ensureUserProfile(this.prisma, user);

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

  async listMemberships(tenantId: string) {
    return this.prisma.membership.findMany({
      where: { tenant_id: tenantId },
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async updateMembershipRole(
    tenantId: string,
    membershipId: string,
    input: MembershipUpdateInput,
  ) {
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

  async removeMembership(tenantId: string, membershipId: string) {
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
}
