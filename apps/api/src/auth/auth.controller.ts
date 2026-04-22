import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RequestUser } from '../common/interfaces/request-user';

@Controller()
export class AuthController {
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  getMe(@Req() req: { user: RequestUser }) {
    return { user: req.user };
  }
}
