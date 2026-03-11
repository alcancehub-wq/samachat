import { BadRequestException, Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import type { TenantRequestContext } from '../common/interfaces/request-tenant';
import { ConversationQuery } from '../modules/messages/conversation.query';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationQuery: ConversationQuery) {}

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get()
  async listConversations(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.conversationQuery.listConversations(req.tenantId);
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Get(':id/messages')
  async listMessages(
    @Param('id') id: string,
    @Req() req: TenantRequestContext,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }

    return this.conversationQuery.listMessages({
      tenantId: req.tenantId,
      conversationId: id,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }
}
