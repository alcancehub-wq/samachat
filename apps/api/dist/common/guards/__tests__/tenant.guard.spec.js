"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const tenant_guard_1 = require("../tenant.guard");
const tenant_utils_1 = require("../../tenant/tenant.utils");
jest.mock('../../tenant/tenant.utils', () => ({
    requireMembership: jest.fn(),
}));
describe('TenantGuard', () => {
    const prisma = {};
    const createContext = (request) => ({
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    });
    beforeEach(() => {
        jest.resetAllMocks();
    });
    it('rejects when user is missing', async () => {
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const context = createContext({ headers: {}, params: {} });
        await expect(guard.canActivate(context)).rejects.toThrow(new common_1.ForbiddenException('Missing authenticated user'));
    });
    it('rejects when tenant headers mismatch', async () => {
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const context = createContext({
            user: { id: 'user-1' },
            headers: { 'x-tenant-id': 'tenant-a' },
            params: { tenantId: 'tenant-b' },
        });
        await expect(guard.canActivate(context)).rejects.toThrow(new common_1.ForbiddenException('Tenant context mismatch'));
    });
    it('rejects when tenant context is missing', async () => {
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const context = createContext({
            user: { id: 'user-1' },
            headers: {},
            params: {},
        });
        await expect(guard.canActivate(context)).rejects.toThrow(new common_1.ForbiddenException('Missing tenant context'));
    });
    it('rejects when membership is required', async () => {
        tenant_utils_1.requireMembership.mockRejectedValueOnce(new Error('MEMBERSHIP_REQUIRED'));
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const context = createContext({
            user: { id: 'user-1' },
            headers: { 'x-tenant-id': 'tenant-a' },
            params: {},
        });
        await expect(guard.canActivate(context)).rejects.toThrow(new common_1.ForbiddenException('Membership required for tenant'));
    });
    it('rejects when membership lookup fails', async () => {
        tenant_utils_1.requireMembership.mockRejectedValueOnce(new Error('oops'));
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const context = createContext({
            user: { id: 'user-1' },
            headers: { 'x-tenant-id': 'tenant-a' },
            params: {},
        });
        await expect(guard.canActivate(context)).rejects.toThrow(new common_1.ForbiddenException('Access denied'));
    });
    it('assigns tenant context when membership is valid', async () => {
        tenant_utils_1.requireMembership.mockResolvedValueOnce({
            membership: { id: 'member-1' },
            profile: { id: 'profile-1' },
        });
        const guard = new tenant_guard_1.TenantGuard(prisma);
        const request = {
            user: { id: 'user-1' },
            headers: { 'x-tenant-id': 'tenant-a' },
            params: {},
        };
        const context = createContext(request);
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(request.tenantId).toBe('tenant-a');
        expect(request.membership).toEqual({ id: 'member-1' });
        expect(request.userProfile).toEqual({ id: 'profile-1' });
    });
});
