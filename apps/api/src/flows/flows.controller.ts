import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('flows')
export class FlowsController {
  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  listFlows() {
    return {
      items: [],
    };
  }
}
