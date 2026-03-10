import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  membershipUpdateSchema,
  tenantCreateSchema,
  MembershipUpdateInput,
  TenantCreateInput,
} from '@samachat/shared';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequestUser } from '../common/interfaces/request-user';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get()
  listTenants(@Req() req: { user: RequestUser }) {
    return this.tenantsService.listTenants(req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post()
  createTenant(
    @Body(new ZodValidationPipe(tenantCreateSchema)) body: TenantCreateInput,
    @Req() req: { user: RequestUser },
  ) {
    return this.tenantsService.createTenant(body, req.user);
  }

  @Get(':tenantId/memberships')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard)
  @Roles('admin', 'manager')
  async listMemberships(
    @Param('tenantId') tenantId: string,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    return this.tenantsService.listMemberships(tenantId);
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard)
  @Roles('admin')
  @Patch(':tenantId/memberships/:membershipId')
  async updateMembershipRole(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(membershipUpdateSchema)) body: MembershipUpdateInput,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.updateMembershipRole(tenantId, membershipId, body);
    } catch {
      throw new BadRequestException('Membership not found');
    }
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard)
  @Roles('admin')
  @Delete(':tenantId/memberships/:membershipId')
  async removeMembership(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.removeMembership(tenantId, membershipId);
    } catch {
      throw new BadRequestException('Membership not found');
    }
  }
}
