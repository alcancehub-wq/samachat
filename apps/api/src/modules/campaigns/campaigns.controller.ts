import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { CampaignsService } from './campaigns.service';
import type { CampaignCreateInput } from './types';

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  async create(@Req() req: TenantRequestContext, @Body() body: CampaignCreateInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.createCampaign(req.tenantId, body);
  }

  @Get()
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.listCampaigns(req.tenantId);
  }

  @Get(':id')
  async get(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.getCampaign(req.tenantId, id);
  }

  @Post(':id/start')
  async start(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.startCampaign(req.tenantId, id);
  }

  @Post(':id/pause')
  async pause(@Req() req: TenantRequestContext, @Param('id') id: string) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.campaignsService.pauseCampaign(req.tenantId, id);
  }
}
