import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('integrations')
export class IntegrationsController {
  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  listIntegrations() {
    return {
      items: [
        { type: 'waba', status: 'stub' },
        { type: 'openai', status: 'stub' },
        { type: 'typebot', status: 'stub' },
        { type: 'webhook', status: 'stub' },
      ],
    };
  }
}
