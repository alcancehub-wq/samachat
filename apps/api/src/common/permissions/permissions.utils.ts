import type { AccessProfile, Membership, MembershipAccessProfile, Role } from '@prisma/client';

export type MembershipWithPermissions = Membership & {
  access_profile?: AccessProfile | null;
  access_profiles?: MembershipAccessProfile[] | null;
};

function normalizePermissionValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string') as string[];
}

export function getEffectivePermissions(membership?: MembershipWithPermissions | null): string[] {
  if (!membership) {
    return [];
  }

  const combined = new Set<string>();

  const primaryPermissions = normalizePermissionValue(membership.access_profile?.permissions);
  primaryPermissions.forEach((item) => combined.add(item));

  if (membership.access_profiles && membership.access_profiles.length > 0) {
    membership.access_profiles.forEach((entry) => {
      const entryPermissions = normalizePermissionValue((entry as any).access_profile?.permissions);
      entryPermissions.forEach((item) => combined.add(item));
    });
  }

  const override = membership.permissions_override;
  if (typeof override !== 'undefined' && override !== null) {
    normalizePermissionValue(override).forEach((item) => combined.add(item));
  }

  if (membership.role === 'admin') {
    combined.add('*');
  }

  if (combined.size > 0) {
    return Array.from(combined);
  }

  return fallbackPermissionsForRole(membership.role);
}

function fallbackPermissionsForRole(role: Role | null): string[] {
  if (!role) {
    return [];
  }

  if (role === 'admin') {
    return ['*'];
  }

  if (role === 'manager') {
    return ['users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_profiles'];
  }

  return ['users:view'];
}

export function hasPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes('*')) {
    return true;
  }
  return required.some((item) => permissions.includes(item));
}
