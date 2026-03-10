import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('campaigns')
export class CampaignsController {
  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  listCampaigns() {
    return {
      items: [],
    };
  }
}
