import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import type { RequestUser } from '../../common/interfaces/request-user';
import { CrmService } from './crm.service';

interface CreateLeadPayload {
  conversation_id: string;
}

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('create-lead')
  async createLead(
    @Body() payload: CreateLeadPayload,
    @Req() req: TenantRequestContext & { user?: RequestUser },
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    if (!req.user?.id) {
      throw new BadRequestException('Missing user context');
    }

    return this.crmService.createLead({
      tenant_id: req.tenantId,
      user_id: req.user.id,
      conversation_id: payload.conversation_id,
    });
  }
}
