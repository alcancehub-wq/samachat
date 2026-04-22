import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { DialogsService } from './dialogs.service';
import type { DialogInput } from './types';

@UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
@Controller('dialogs')
export class DialogsController {
  constructor(private readonly dialogsService: DialogsService) {}

  @Get()
  @Permissions('dialogs:view')
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.dialogsService.listDialogs(req.tenantId);
  }

  @Get(':id([a-z0-9]{25})')
  @Permissions('dialogs:view')
  async get(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.dialogsService.getDialog(req.tenantId, id);
  }

  @Post()
  @Permissions('dialogs:create')
  async create(@Req() req: TenantRequestContext, @Body() body: DialogInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.dialogsService.createDialog(req.tenantId, body);
  }

  @Patch(':id([a-z0-9]{25})')
  @Permissions('dialogs:edit')
  async update(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: Partial<DialogInput>,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.dialogsService.updateDialog(req.tenantId, id, body);
  }

  @Delete(':id([a-z0-9]{25})')
  @Permissions('dialogs:delete')
  async remove(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.dialogsService.deleteDialog(req.tenantId, id);
  }
}
