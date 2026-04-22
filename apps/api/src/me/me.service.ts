import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ensureUserProfile } from '../common/tenant/tenant.utils';
import { getConfig } from '@samachat/config';
import type { RequestUser } from '../common/interfaces/request-user';
import { getEffectivePermissions } from '../common/permissions/permissions.utils';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async listMemberships(user: RequestUser) {
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

  async onboardingStatus(user: RequestUser, tenantId?: string) {
    const config = getConfig();
    const profile = await ensureUserProfile(this.prisma, user);

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

  async listPermissions(user: RequestUser, tenantId: string) {
    const profile = await ensureUserProfile(this.prisma, user);
    const membership = await this.prisma.membership.findFirst({
      where: { tenant_id: tenantId, user_id: profile.id },
      include: {
        access_profile: true,
        access_profiles: { include: { access_profile: true } },
      },
    });

    const permissions = getEffectivePermissions(membership ?? undefined);
    return { permissions };
  }
}
