import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import type { TenantRequestContext } from '../common/interfaces/request-tenant';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceRole } from '@prisma/client';

interface WorkspaceRenamePayload {
  name: string;
}

interface AddWorkspaceUserPayload {
  email: string;
  role: 'owner' | 'admin' | 'agent';
}

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.workspacesService.listWorkspaces(req.tenantId);
  }

  @Patch(':id')
  @UseGuards(RbacGuard)
  @Roles('admin', 'manager')
  async rename(
    @Param('id') id: string,
    @Req() req: TenantRequestContext,
    @Body() body: WorkspaceRenamePayload,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    if (!body?.name) {
      throw new BadRequestException('Missing name');
    }
    return this.workspacesService.renameWorkspace(req.tenantId, id, body.name);
  }

  @Get(':id/users')
  @UseGuards(RbacGuard)
  @Roles('admin', 'manager')
  async listUsers(@Param('id') id: string, @Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.workspacesService.listWorkspaceUsers(req.tenantId, id);
  }

  @Post(':id/users')
  @UseGuards(RbacGuard)
  @Roles('admin')
  async addUser(
    @Param('id') id: string,
    @Req() req: TenantRequestContext,
    @Body() body: AddWorkspaceUserPayload,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    if (!body?.email) {
      throw new BadRequestException('Missing email');
    }
    return this.workspacesService.addWorkspaceUser({
      tenantId: req.tenantId,
      workspaceId: id,
      userEmail: body.email,
      role: (body.role || 'agent') as WorkspaceRole,
    });
  }

  @Delete(':id/users/:workspaceUserId')
  @UseGuards(RbacGuard)
  @Roles('admin')
  async removeUser(
    @Param('id') id: string,
    @Param('workspaceUserId') workspaceUserId: string,
    @Req() req: TenantRequestContext,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.workspacesService.removeWorkspaceUser(req.tenantId, id, workspaceUserId);
  }
}
