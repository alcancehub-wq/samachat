import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('media')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get(':key')
  async serveMedia(@Param('key') key: string, @Res({ passthrough: true }) res: Response) {
    const asset = await this.storage.getAssetByKey(key);
    if (!asset) {
      throw new NotFoundException('Media not found');
    }

    if (asset.provider !== 'local') {
      res.redirect(asset.url);
      return;
    }

    const contentType = asset.metadata?.contentType ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const stream = this.storage.createLocalStream(asset.storageKey);
    return new StreamableFile(stream);
  }
}
