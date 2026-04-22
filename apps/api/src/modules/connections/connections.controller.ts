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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ConnectionsService } from './connections.service';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';

interface CreateConnectionPayload {
  phoneNumber?: string;
}

@UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  @Permissions('connections:create')
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
  @Permissions('connections:view')
  listConnections(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.connectionsService.listConnections(req.tenantId);
  }

  @Get(':id/qr')
  @Permissions('connections:qr')
  getQrCode(@Param('id') id: string, @Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.connectionsService.getQrCode(id, req.tenantId);
  }

  @Delete(':id')
  @Permissions('connections:disconnect')
  disconnect(@Param('id') id: string, @Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.connectionsService.disconnect(id, req.tenantId);
  }

  @Delete(':id/remove')
  @Permissions('connections:disconnect')
  remove(@Param('id') id: string, @Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.connectionsService.remove(id, req.tenantId);
  }
}
