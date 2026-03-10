import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireMembership } from '../tenant/tenant.utils';
import type { RequestUser } from '../interfaces/request-user';
import type { TenantRequestContext } from '../interfaces/request-tenant';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<TenantRequestContext & { user?: RequestUser }>();

    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Missing authenticated user');
    }

    // Cast para acessar headers sem brigar com o tipo TenantRequestContext
    const headers = (request as any).headers as Record<string, unknown> | undefined;
    const headerTenant = headers?.['x-tenant-id'];
    const paramTenant = (request as any)?.params?.tenantId;

    const headerTenantId = typeof headerTenant === 'string' ? headerTenant : undefined;
    const paramTenantId = typeof paramTenant === 'string' ? paramTenant : undefined;

    if (headerTenantId && paramTenantId && headerTenantId !== paramTenantId) {
      throw new ForbiddenException('Tenant context mismatch');
    }

    const tenantId = headerTenantId || paramTenantId;

    if (!tenantId) {
      throw new ForbiddenException('Missing tenant context');
    }

    try {
      const { membership, profile } = await requireMembership(this.prisma, user, tenantId);

      request.tenantId = tenantId;
      request.membership = membership;
      request.userProfile = profile;

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forbidden';
      if (message === 'MEMBERSHIP_REQUIRED') {
        throw new ForbiddenException('Membership required for tenant');
      }
      throw new ForbiddenException('Access denied');
    }
  }
}