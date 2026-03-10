import type { Membership, UserProfile } from '@prisma/client';
import type { Role } from '@samachat/shared';

export interface TenantRequestContext {
  tenantId?: string;
  membership?: Membership;
  membershipRole?: Role;
  userProfile?: UserProfile;
}
