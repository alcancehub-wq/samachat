import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import type { RequestUser } from '../common/interfaces/request-user';
import { MeService } from './me.service';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('memberships')
  async listMemberships(@Req() req: { user: RequestUser }) {
    return this.meService.listMemberships(req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('onboarding-status')
  async onboardingStatus(
    @Req() req: { user: RequestUser },
    @Headers('x-tenant-id') tenantHeader?: string,
  ) {
    const tenantId = typeof tenantHeader === 'string' ? tenantHeader : undefined;
    return this.meService.onboardingStatus(req.user, tenantId);
  }
}
