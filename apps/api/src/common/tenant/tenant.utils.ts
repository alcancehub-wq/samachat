import type { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../interfaces/request-user';
import type { AccessProfile, Membership, MembershipAccessProfile, UserProfile } from '@prisma/client';
import { Role } from '@samachat/shared';

const ROLE_ORDER: Record<Role, number> = {
  admin: 3,
  manager: 2,
  agent: 1,
};

export async function ensureUserProfile(
  prisma: PrismaService,
  user: RequestUser,
): Promise<UserProfile> {
  const existing = await prisma.userProfile.findFirst({
    where: {
      OR: [{ auth_user_id: user.id }, { email: user.email }],
    },
  });

  if (existing) {
    const shouldUpdateName = Boolean(user.name) && existing.full_name !== user.name;
    if (!existing.auth_user_id || shouldUpdateName) {
      return prisma.userProfile.update({
        where: { id: existing.id },
        data: {
          auth_user_id: existing.auth_user_id ?? user.id,
          email: user.email,
          full_name: user.name ?? existing.full_name ?? null,
        },
      });
    }
    return existing;
  }

  return prisma.userProfile.create({
    data: {
      auth_user_id: user.id,
      email: user.email,
      full_name: user.name ?? null,
    },
  });
}

export type MembershipWithProfile = Membership & { access_profile?: AccessProfile | null };
export type MembershipWithProfiles = Membership & {
  access_profile?: AccessProfile | null;
  access_profiles?: MembershipAccessProfile[] | null;
};

export async function requireMembership(
  prisma: PrismaService,
  user: RequestUser,
  tenantId: string,
): Promise<{ membership: MembershipWithProfiles; profile: UserProfile }>
{
  const profile = await ensureUserProfile(prisma, user);
  const membership = await prisma.membership.findFirst({
    where: {
      tenant_id: tenantId,
      user_id: profile.id,
    },
    include: {
      access_profile: true,
      access_profiles: { include: { access_profile: true } },
    },
  });

  if (!membership) {
    throw new Error('MEMBERSHIP_REQUIRED');
  }

  return { membership, profile };
}

export async function requireRole(
  prisma: PrismaService,
  user: RequestUser,
  tenantId: string,
  minRole: Role,
): Promise<{ membership: Membership; profile: UserProfile }>
{
  const { membership, profile } = await requireMembership(prisma, user, tenantId);
  const membershipRank = ROLE_ORDER[membership.role as Role] ?? 0;
  const requiredRank = ROLE_ORDER[minRole] ?? 0;

  if (membershipRank < requiredRank) {
    throw new Error('ROLE_FORBIDDEN');
  }

  return { membership, profile };
}
