import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('conversations')
export class ConversationsController {
  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  listConversations() {
    return {
      items: [],
    };
  }
}
