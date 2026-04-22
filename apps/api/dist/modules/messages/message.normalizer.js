"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageNormalizer = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let MessageNormalizer = class MessageNormalizer {
    normalize(message) {
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
        const text = payload.conversation ??
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
            direction: client_1.MessageDirection.INBOUND,
            mediaType: media?.type ?? null,
            mediaMime: media?.mime ?? null,
            mediaSize: media?.size ?? null,
            mediaFileName: media?.fileName ?? null,
            mediaExtension: media?.extension ?? null,
        };
    }
    detectMessageType(payload) {
        if (payload.conversation)
            return 'text';
        if (payload.extendedTextMessage)
            return 'text';
        if (payload.imageMessage)
            return 'image';
        if (payload.videoMessage)
            return 'video';
        if (payload.audioMessage)
            return 'audio';
        if (payload.documentMessage)
            return 'document';
        if (payload.stickerMessage)
            return 'sticker';
        return 'unknown';
    }
    extractMedia(payload) {
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
    toSize(value) {
        if (!value) {
            return null;
        }
        if (typeof value === 'number') {
            return value;
        }
        const asNumber = Number(value);
        return Number.isFinite(asNumber) ? asNumber : null;
    }
    extensionFromMime(mime) {
        if (!mime) {
            return null;
        }
        const map = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'video/mp4': 'mp4',
            'audio/mpeg': 'mp3',
            'application/pdf': 'pdf',
            'image/webp': 'webp',
        };
        return map[mime] ?? null;
    }
    resolveTimestamp(timestamp) {
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
};
exports.MessageNormalizer = MessageNormalizer;
exports.MessageNormalizer = MessageNormalizer = __decorate([
    (0, common_1.Injectable)()
], MessageNormalizer);
