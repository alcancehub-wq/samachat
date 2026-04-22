"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const supabase_auth_guard_1 = require("../../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const permissions_guard_1 = require("../../common/guards/permissions.guard");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const messages_service_1 = require("./messages.service");
const storage_service_1 = require("../../storage/storage.service");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
let MessagesController = class MessagesController {
    messagesService;
    storage;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'messages-controller' });
    constructor(messagesService, storage) {
        this.messagesService = messagesService;
        this.storage = storage;
    }
    async sendMessage(payload, req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        this.logger.info({
            tenantId: req.tenantId,
            conversationId: payload.conversation_id,
            type: payload.type ?? 'text',
        }, 'OUTBOUND API');
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
    async sendQueuedMessage(payload, secret) {
        const expected = process.env.PROVIDER_SECRET;
        if (!expected || !secret || secret !== expected) {
            throw new common_1.UnauthorizedException('Invalid provider secret');
        }
        if (!payload?.jid || !payload.text) {
            throw new common_1.BadRequestException('Missing jid or text');
        }
        return this.messagesService.sendQueuedMessage(payload);
    }
    async uploadMedia(file, req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        if (!file) {
            throw new common_1.BadRequestException('File is required');
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
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Post)('send'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('messages:send'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('send-queued'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-provider-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "sendQueuedMessage", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('files:create'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: (0, config_1.getConfig)().uploads.maxUploadMb * 1024 * 1024,
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
                callback(new common_1.BadRequestException('Unsupported file type'), false);
                return;
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "uploadMedia", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard),
    (0, common_1.Controller)('messages'),
    __metadata("design:paramtypes", [messages_service_1.MessagesService,
        storage_service_1.StorageService])
], MessagesController);
