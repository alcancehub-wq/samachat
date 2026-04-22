import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { CampaignsService } from './campaigns.service';
import type { CampaignCreateInput } from './types';

@UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Permissions('campaigns:create')
  async create(@Req() req: TenantRequestContext, @Body() body: CampaignCreateInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.createCampaign(req.tenantId, body, req.userProfile?.id ?? null);
  }

  @Get()
  @Permissions('campaigns:view')
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.listCampaigns(req.tenantId);
  }

  @Get(':id')
  @Permissions('campaigns:view')
  async get(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.getCampaign(req.tenantId, id);
  }

  @Post(':id/start')
  @Permissions('campaigns:resume')
  async start(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.startCampaign(req.tenantId, id);
  }

  @Post(':id/pause')
  @Permissions('campaigns:pause')
  async pause(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.pauseCampaign(req.tenantId, id);
  }

  @Delete(':id')
  @Permissions('campaigns:delete')
  async remove(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.deleteCampaign(req.tenantId, id, req.userProfile?.id ?? null);
  }
}
