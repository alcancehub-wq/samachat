import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { DialogTagsService, TagInput } from './tags.service';

@UseGuards(SupabaseAuthGuard, TenantGuard, PermissionsGuard)
@Controller('dialogs/tags')
export class DialogTagsController {
  constructor(private readonly tagsService: DialogTagsService) {}

  @Get()
  @Permissions('tags:view')
  async list(@Req() req: TenantRequestContext) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.tagsService.listTags(req.tenantId);
  }

  @Post()
  @Permissions('tags:create')
  async create(@Req() req: TenantRequestContext, @Body() body: TagInput) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.tagsService.createTag(req.tenantId, body);
  }

  @Put(':id')
  @Permissions('tags:create')
  async update(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Body() body: TagInput,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.tagsService.updateTag(req.tenantId, id, body);
  }

  @Delete(':id')
  @Permissions('tags:delete')
  async remove(
    @Req() req: TenantRequestContext,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    return this.tagsService.deleteTag(req.tenantId, id, force === 'true');
  }
}
