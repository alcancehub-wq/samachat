import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ConnectionsService } from './connections.service';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';

interface CreateConnectionPayload {
  phoneNumber?: string;
}

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  createConnection(
    @Req() req: TenantRequestContext,
    @Body() payload?: CreateConnectionPayload,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.connectionsService.createConnection(req.tenantId, payload?.phoneNumber ?? null);
  }

  @Get()
  listConnections() {
    return this.connectionsService.listConnections();
  }

  @Get(':id/qr')
  getQrCode(@Param('id') id: string) {
    return this.connectionsService.getQrCode(id);
  }

  @Delete(':id')
  disconnect(@Param('id') id: string) {
    return this.connectionsService.disconnect(id);
  }
}
