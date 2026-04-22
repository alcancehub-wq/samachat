import type { AccessProfile, Membership, MembershipAccessProfile, UserProfile } from '@prisma/client';
import type { Role } from '@samachat/shared';

export interface TenantRequestContext {
  tenantId?: string;
  membership?: Membership & {
    access_profile?: AccessProfile | null;
    access_profiles?: MembershipAccessProfile[] | null;
  };
  membershipRole?: Role;
  userProfile?: UserProfile;
}
