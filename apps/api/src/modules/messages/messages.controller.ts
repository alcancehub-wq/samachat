import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import type { TenantRequestContext } from '../../common/interfaces/request-tenant';
import { MessagesService } from './messages.service';
import { StorageService } from '../../storage/storage.service';
import { getConfig } from '@samachat/config';

interface SendMessagePayload {
  conversation_id: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  media_url?: string;
  media_mime?: string;
  media_size?: number;
}

@UseGuards(SupabaseAuthGuard, TenantGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly storage: StorageService,
  ) {}

  @Post('send')
  async sendMessage(
    @Body() payload: SendMessagePayload,
    @Req() req: TenantRequestContext,
  ) {
    if (!req.tenantId) {
      throw new BadRequestException('Missing tenant context');
    }

    return this.messagesService.sendWhatsAppMessage({
      tenantId: req.tenantId,
      conversationId: payload.conversation_id,
      content: payload.content,
      type: payload.type,
      mediaUrl: payload.media_url ?? null,
      mediaMime: payload.media_mime ?? null,
      mediaSize: payload.media_size ?? null,
    });
  }

  @Post('upload')
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
