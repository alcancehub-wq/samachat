import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('campaigns')
export class CampaignsController {
  @UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('campaigns:view')
  @Get()
  listCampaigns() {
    return {
      items: [],
    };
  }
}
