import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { DialogVariablesService, VariableInput } from './variables.service';

@UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
@Controller('dialogs/variables')
export class DialogVariablesController {
  constructor(private readonly variablesService: DialogVariablesService) {}

  @Get()
  @Permissions('custom_fields:view')
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.variablesService.listVariables(req.tenantId);
  }

  @Post()
  @Permissions('custom_fields:create')
  async create(@Req() req: TenantRequestContext, @Body() body: VariableInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.variablesService.createVariable(req.tenantId, body);
  }

  @Put(':id')
  @Permissions('custom_fields:create')
  async update(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: Partial<VariableInput>,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.variablesService.updateVariable(req.tenantId, id, body);
  }

  @Delete(':id')
  @Permissions('custom_fields:delete')
  async remove(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.variablesService.deleteVariable(req.tenantId, id, force === 'true');
  }
}
