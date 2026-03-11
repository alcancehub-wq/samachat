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
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { AutomationService } from './automation.service';
import type { AutomationInput } from './types';

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('automations')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.automationService.listAutomations(req.tenantId);
  }

  @Post()
  async create(@Req() req: TenantRequestContext, @Body() body: AutomationInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    if (!body?.name || !body.trigger_type || !body.actions?.length) {
      throw new BadRequestException('Invalid automation payload');
    }
    return this.automationService.createAutomation(req.tenantId, body);
  }

  @Patch(':id')
  async update(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: Partial<AutomationInput>,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.automationService.updateAutomation(req.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.automationService.deleteAutomation(req.tenantId, id);
  }
}
