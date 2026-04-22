import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InviteCreateInput, inviteCreateSchema } from '@samachat/shared';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { InvitesService } from './invites.service';
import type { RequestUser } from '../common/interfaces/request-user';

@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('invites/pending')
  listPending(@Req() req: { user: RequestUser }) {
    return this.invitesService.listPendingInvites(req.user.email);
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard, RbacGuard)
  @Roles('admin', 'manager')
  @Post('tenants/:tenantId/invites')
  async createInvite(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(inviteCreateSchema)) body: InviteCreateInput,
    @Req() req: { user: RequestUser; tenantId?: string },
  ) {
    if (req.tenantId && req.tenantId !== tenantId) {
      throw new BadRequestException('Tenant context mismatch');
    }

    return this.invitesService.createInvite(tenantId, body, req.user);
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('invites/:token/accept')
  async acceptInvite(@Param('token') token: string, @Req() req: { user: RequestUser }) {
    try {
      return await this.invitesService.acceptInvite(token, req.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invite error';
      if (message === 'INVITE_NOT_FOUND') {
        throw new BadRequestException('Invite not found');
      }
      if (message === 'INVITE_EXPIRED') {
        throw new BadRequestException('Invite expired');
      }
      throw new BadRequestException('Invite could not be accepted');
    }
  }
}
