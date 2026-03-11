import { Injectable } from '@nestjs/common';
import type { proto } from '@whiskeysockets/baileys';
import { MessageDirection } from '@prisma/client';
import type { NormalizedMessage } from './types';

@Injectable()
export class MessageNormalizer {
  normalize(message: proto.IWebMessageInfo): NormalizedMessage | null {
    const remoteJid = message.key?.remoteJid;
    const externalId = message.key?.id;
    if (!remoteJid || !externalId) {
      return null;
    }

    const phoneNumber = remoteJid.split('@')[0];
    if (!phoneNumber) {
      return null;
    }

    const payload = message.message;
    if (!payload) {
      return null;
    }

    const text =
      payload.conversation ??
      payload.extendedTextMessage?.text ??
      payload.imageMessage?.caption ??
      payload.videoMessage?.caption ??
      payload.documentMessage?.caption ??
      null;

    const media = this.extractMedia(payload);
    const messageType = this.detectMessageType(payload);
    const timestamp = this.resolveTimestamp(message.messageTimestamp);

    return {
      phoneNumber,
      messageText: text,
      messageType,
      externalId,
      timestamp,
      direction: MessageDirection.INBOUND,
      mediaType: media?.type ?? null,
      mediaMime: media?.mime ?? null,
      mediaSize: media?.size ?? null,
      mediaFileName: media?.fileName ?? null,
      mediaExtension: media?.extension ?? null,
    };
  }

  private detectMessageType(payload: proto.IMessage): string {
    if (payload.conversation) return 'text';
    if (payload.extendedTextMessage) return 'text';
    if (payload.imageMessage) return 'image';
    if (payload.videoMessage) return 'video';
    if (payload.audioMessage) return 'audio';
    if (payload.documentMessage) return 'document';
    if (payload.stickerMessage) return 'sticker';
    return 'unknown';
  }

  private extractMedia(payload: proto.IMessage) {
    const image = payload.imageMessage;
    if (image) {
      return {
        type: 'image',
        mime: image.mimetype ?? null,
        size: this.toSize(image.fileLength),
        fileName: null,
        extension: this.extensionFromMime(image.mimetype),
      };
    }

    const video = payload.videoMessage;
    if (video) {
      return {
        type: 'video',
        mime: video.mimetype ?? null,
        size: this.toSize(video.fileLength),
        fileName: null,
        extension: this.extensionFromMime(video.mimetype),
      };
    }

    const audio = payload.audioMessage;
    if (audio) {
      return {
        type: 'audio',
        mime: audio.mimetype ?? null,
        size: this.toSize(audio.fileLength),
        fileName: null,
        extension: this.extensionFromMime(audio.mimetype),
      };
    }

    const document = payload.documentMessage;
    if (document) {
      return {
        type: 'document',
        mime: document.mimetype ?? null,
        size: this.toSize(document.fileLength),
        fileName: document.fileName ?? null,
        extension: this.extensionFromMime(document.mimetype),
      };
    }

    const sticker = payload.stickerMessage;
    if (sticker) {
      return {
        type: 'sticker',
        mime: sticker.mimetype ?? null,
        size: this.toSize(sticker.fileLength),
        fileName: null,
        extension: this.extensionFromMime(sticker.mimetype),
      };
    }

    return null;
  }

  private toSize(value?: unknown): number | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  private extensionFromMime(mime?: string | null) {
    if (!mime) {
      return null;
    }
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'application/pdf': 'pdf',
      'image/webp': 'webp',
    };
    return map[mime] ?? null;
  }

  private resolveTimestamp(timestamp?: unknown): Date {
    if (!timestamp) {
      return new Date();
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp * 1000);
    }
    const asNumber = Number(timestamp);
    if (!Number.isNaN(asNumber)) {
      return new Date(asNumber * 1000);
    }
    return new Date();
  }
}
