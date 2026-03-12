"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectivePermissions = getEffectivePermissions;
exports.hasPermission = hasPermission;
function normalizePermissionValue(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item) => typeof item === 'string');
}
function getEffectivePermissions(membership) {
    if (!membership) {
        return [];
    }
    const combined = new Set();
    const primaryPermissions = normalizePermissionValue(membership.access_profile?.permissions);
    primaryPermissions.forEach((item) => combined.add(item));
    if (membership.access_profiles && membership.access_profiles.length > 0) {
        membership.access_profiles.forEach((entry) => {
            const entryPermissions = normalizePermissionValue(entry.access_profile?.permissions);
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
function fallbackPermissionsForRole(role) {
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
function hasPermission(permissions, required) {
    if (permissions.includes('*')) {
        return true;
    }
    return required.some((item) => permissions.includes(item));
}
