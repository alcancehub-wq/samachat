import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { TenantGuard } from '../tenant.guard';
import { requireMembership } from '../../tenant/tenant.utils';

type MockRequest = {
  user?: { id: string };
  headers?: Record<string, unknown>;
  params?: Record<string, unknown>;
  tenantId?: string;
  membership?: unknown;
  userProfile?: unknown;
};

jest.mock('../../tenant/tenant.utils', () => ({
  requireMembership: jest.fn(),
}));

describe('TenantGuard', () => {
  const prisma = {} as any;

  const createContext = (request: MockRequest): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects when user is missing', async () => {
    const guard = new TenantGuard(prisma);
    const context = createContext({ headers: {}, params: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Missing authenticated user'),
    );
  });

  it('rejects when tenant headers mismatch', async () => {
    const guard = new TenantGuard(prisma);
    const context = createContext({
      user: { id: 'user-1' },
      headers: { 'x-tenant-id': 'tenant-a' },
      params: { tenantId: 'tenant-b' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Tenant context mismatch'),
    );
  });

  it('rejects when tenant context is missing', async () => {
    const guard = new TenantGuard(prisma);
    const context = createContext({
      user: { id: 'user-1' },
      headers: {},
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Missing tenant context'),
    );
  });

  it('rejects when membership is required', async () => {
    (requireMembership as jest.Mock).mockRejectedValueOnce(
      new Error('MEMBERSHIP_REQUIRED'),
    );

    const guard = new TenantGuard(prisma);
    const context = createContext({
      user: { id: 'user-1' },
      headers: { 'x-tenant-id': 'tenant-a' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Membership required for tenant'),
    );
  });

  it('rejects when membership lookup fails', async () => {
    (requireMembership as jest.Mock).mockRejectedValueOnce(new Error('oops'));

    const guard = new TenantGuard(prisma);
    const context = createContext({
      user: { id: 'user-1' },
      headers: { 'x-tenant-id': 'tenant-a' },
      params: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Access denied'),
    );
  });

  it('assigns tenant context when membership is valid', async () => {
    (requireMembership as jest.Mock).mockResolvedValueOnce({
      membership: { id: 'member-1' },
      profile: { id: 'profile-1' },
    });

    const guard = new TenantGuard(prisma);
    const request: MockRequest = {
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
