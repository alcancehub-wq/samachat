import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@Controller('users')
export class UsersController {
  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  listUsers() {
    return {
      items: [],
    };
  }
}
