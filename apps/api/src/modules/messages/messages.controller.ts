import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { MessagesService } from './messages.service';
import { StorageService } from '../../storage/storage.service';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';

interface SendMessagePayload {
  conversation_id: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  media_url?: string;
  media_mime?: string;
  media_size?: number;
}

interface SendQueuedPayload {
  tenantId?: string;
  sessionId?: string;
  messageId?: string;
  jid: string;
  text: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string | null;
  mediaMime?: string | null;
  mediaSize?: number | null;
}

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('messages')
export class MessagesController {
  private readonly logger = getLogger({ service: 'api', component: 'messages-controller' });

  constructor(
    private readonly messagesService: MessagesService,
    private readonly storage: StorageService,
  ) {}

  @Post('send')
  @UseGuards(PermissionsGuard)
  @Permissions('messages:send')
  async sendMessage(
    @Body() payload: SendMessagePayload,
    @Req() req: TenantRequestContext,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }

    this.logger.info(
      {
        tenantId: req.tenantId,
        conversationId: payload.conversation_id,
        type: payload.type ?? 'text',
      },
      'OUTBOUND API',
    );

    return this.messagesService.sendWhatsAppMessage({
      tenantId: req.tenantId,
      conversationId: payload.conversation_id,
      content: payload.content,
      type: payload.type,
      mediaUrl: payload.media_url ?? null,
      mediaMime: payload.media_mime ?? null,
      mediaSize: payload.media_size ?? null,
      senderUserId: req.userProfile?.id,
      senderName: req.userProfile?.full_name ?? null,
    });
  }

  @Post('send-queued')
  async sendQueuedMessage(
    @Body() payload: SendQueuedPayload,
    @Headers('x-provider-secret') secret?: string,
  ) {
    const expected = process.env.PROVIDER_SECRET;
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('Invalid provider secret');
    }

    if (!payload?.jid || !payload.text) {
      throw new BadRequestException('Missing jid or text');
    }

    return this.messagesService.sendQueuedMessage(payload);
  }

  @Post('upload')
  @UseGuards(PermissionsGuard)
  @Permissions('files:create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: getConfig().uploads.maxUploadMb * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'video/mp4',
          'audio/mpeg',
          'application/pdf',
        ];
        if (!allowed.includes(file.mimetype)) {
          callback(new BadRequestException('Unsupported file type'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadMedia(
    @UploadedFile()
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Req() req: TenantRequestContext,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.storage.saveMedia(file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
    });

    return {
      url: result.publicUrl,
      mime: file.mimetype,
      size: file.size,
      storage_key: result.storageKey,
    };
  }
}
