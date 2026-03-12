"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUserProfile = ensureUserProfile;
exports.requireMembership = requireMembership;
exports.requireRole = requireRole;
const ROLE_ORDER = {
    admin: 3,
    manager: 2,
    agent: 1,
};
async function ensureUserProfile(prisma, user) {
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
async function requireMembership(prisma, user, tenantId) {
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
async function requireRole(prisma, user, tenantId, minRole) {
    const { membership, profile } = await requireMembership(prisma, user, tenantId);
    const membershipRank = ROLE_ORDER[membership.role] ?? 0;
    const requiredRank = ROLE_ORDER[minRole] ?? 0;
    if (membershipRank < requiredRank) {
        throw new Error('ROLE_FORBIDDEN');
    }
    return { membership, profile };
}
