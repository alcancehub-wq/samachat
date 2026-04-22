import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  accessProfileSchema,
  accessProfileUpdateSchema,
  membershipUpdateSchema,
  tenantCreateSchema,
  userCreateSchema,
  userUpdateSchema,
  AccessProfileInput,
  AccessProfileUpdateInput,
  MembershipUpdateInput,
  TenantCreateInput,
  UserCreateInput,
  UserUpdateInput,
} from '@samachat/shared';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
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

  @Get(':tenantId/access-profiles')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin', 'manager')
  @Permissions('users:view', 'users:manage_profiles')
  async listAccessProfiles(
    @Param('tenantId') tenantId: string,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    return this.tenantsService.listAccessProfiles(tenantId);
  }

  @Post(':tenantId/access-profiles')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:manage_profiles')
  async createAccessProfile(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(accessProfileSchema)) body: AccessProfileInput,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    return this.tenantsService.createAccessProfile(tenantId, body);
  }

  @Patch(':tenantId/access-profiles/:profileId')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:manage_profiles')
  async updateAccessProfile(
    @Param('tenantId') tenantId: string,
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(accessProfileUpdateSchema)) body: AccessProfileUpdateInput,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.updateAccessProfile(tenantId, profileId, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PROFILE_NOT_FOUND';
      if (message === 'PROFILE_NOT_FOUND') {
        throw new BadRequestException('Perfil nao encontrado');
      }
      throw err;
    }
  }

  @Delete(':tenantId/access-profiles/:profileId')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:manage_profiles')
  async removeAccessProfile(
    @Param('tenantId') tenantId: string,
    @Param('profileId') profileId: string,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.removeAccessProfile(tenantId, profileId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PROFILE_NOT_FOUND';
      if (message === 'PROFILE_IN_USE') {
        throw new BadRequestException('Perfil em uso por usuarios');
      }
      throw new BadRequestException('Perfil nao encontrado');
    }
  }

  @Get(':tenantId/users')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin', 'manager')
  @Permissions('users:view')
  async listUsers(
    @Param('tenantId') tenantId: string,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    return this.tenantsService.listUsers(tenantId);
  }

  @Post(':tenantId/users')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:create')
  async createUser(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(userCreateSchema)) body: UserCreateInput,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.createUser(tenantId, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'USER_CREATE_FAILED';
      if (message === 'PROFILE_NOT_FOUND') {
        throw new BadRequestException('Perfil nao encontrado');
      }
      if (message === 'USER_ALREADY_MEMBER') {
        throw new BadRequestException('Usuario ja cadastrado no tenant');
      }
      throw new BadRequestException('Falha ao criar usuario');
    }
  }

  @Patch(':tenantId/users/:membershipId')
  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:edit')
  async updateUser(
    @Param('tenantId') tenantId: string,
    @Param('membershipId') membershipId: string,
    @Body(new ZodValidationPipe(userUpdateSchema)) body: UserUpdateInput,
    @Req() req: { tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    try {
      return await this.tenantsService.updateUser(tenantId, membershipId, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'USER_UPDATE_FAILED';
      if (message === 'PROFILE_NOT_FOUND') {
        throw new BadRequestException('Perfil nao encontrado');
      }
      throw new BadRequestException('Usuario nao encontrado');
    }
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

  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('users:delete')
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
