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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const baileys_1 = require("@whiskeysockets/baileys");
const bullmq_1 = require("bullmq");
const path_1 = __importDefault(require("path"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const message_normalizer_1 = require("./message.normalizer");
const message_processor_1 = require("./message.processor");
const session_manager_1 = require("../connections/session.manager");
const client_1 = require("@prisma/client");
const logger_1 = require("@samachat/logger");
const config_1 = require("@samachat/config");
const storage_service_1 = require("../../storage/storage.service");
const session_store_1 = require("../connections/session.store");
let MessagesService = class MessagesService {
    prisma;
    normalizer;
    processor;
    sessionManager;
    storage;
    redis;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'messages' });
    outboundQueue;
    constructor(prisma, normalizer, processor, sessionManager, storage, redis) {
        this.prisma = prisma;
        this.normalizer = normalizer;
        this.processor = processor;
        this.sessionManager = sessionManager;
        this.storage = storage;
        this.redis = redis;
        this.outboundQueue = new bullmq_1.Queue('outbound-messages', { connection: this.redis });
    }
    async processIncomingMessage(sessionId, message) {
        const normalized = this.normalizer.normalize(message);
        if (!normalized) {
            return;
        }
        const session = await this.prisma.whatsappSession.findUnique({
            where: { session_id: sessionId },
        });
        if (!session) {
            throw new common_1.NotFoundException('Session not found');
        }
        if (normalized.mediaType && normalized.mediaType !== 'text' && normalized.mediaType !== 'unknown') {
            const client = this.sessionManager.getClientByTenant(session.tenant_id);
            const mediaUrl = await this.downloadAndStoreMedia(message, normalized, client?.updateMediaMessage);
            normalized.mediaUrl = mediaUrl;
        }
        await this.processor.processInboundMessage(session.tenant_id, normalized);
    }
    async createOutboundPlaceholder(params) {
        return this.processor.createOutboundPlaceholder(params);
    }
    async sendWhatsAppMessage(params) {
        const messageType = params.type ?? 'text';
        const allowedTypes = ['text', 'image', 'video', 'audio', 'document'];
        if (!allowedTypes.includes(messageType)) {
            throw new common_1.BadRequestException('Unsupported message type');
        }
        if (messageType === 'text' && (!params.content || params.content.trim().length === 0)) {
            throw new common_1.BadRequestException('Content is required');
        }
        if (messageType !== 'text' && !params.mediaUrl) {
            throw new common_1.BadRequestException('Media URL is required');
        }
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: params.conversationId,
                tenant_id: params.tenantId,
            },
            include: { contact: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const phone = params.phoneNumber || conversation.contact.phone_number;
        if (!phone) {
            throw new common_1.BadRequestException('Phone number not available');
        }
        const session = await this.prisma.whatsappSession.findFirst({
            where: {
                tenant_id: params.tenantId,
                status: client_1.ConnectionStatus.CONNECTED,
            },
        });
        if (!session) {
            throw new common_1.ServiceUnavailableException('No active WhatsApp session');
        }
        const jid = this.buildJid(phone);
        const provider = (0, config_1.getConfig)().providerMode === 'waba' ? 'waba' : 'qr';
        this.logger.info({
            tenantId: params.tenantId,
            conversationId: conversation.id,
            contactId: conversation.contact_id,
            jid,
            messageType,
        }, 'Sending WhatsApp outbound message');
        const externalId = `outbound:${Date.now()}:${conversation.contact_id}`;
        const message = await this.prisma.message.create({
            data: {
                tenant_id: params.tenantId,
                conversation_id: conversation.id,
                contact_id: conversation.contact_id,
                sender_user_id: params.senderUserId ?? null,
                direction: client_1.MessageDirection.OUTBOUND,
                type: messageType,
                content: params.content ?? null,
                media_url: params.mediaUrl ?? null,
                media_type: messageType === 'text' ? null : messageType,
                media_mime: params.mediaMime ?? null,
                media_size: params.mediaSize ?? null,
                status: client_1.MessageStatus.SENT,
                external_id: externalId,
                timestamp: new Date(),
                body: params.content ?? (messageType !== 'text' ? `[${messageType}]` : ''),
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                last_message_id: message.id,
                last_message_at: message.timestamp,
            },
        });
        await this.processor.publishMessageSent({
            ...message,
            senderName: params.senderName ?? null,
        });
        await this.outboundQueue.add('send-message', {
            provider,
            tenantId: params.tenantId,
            messageId: message.id,
            sessionId: session.session_id,
            connectionId: session.id,
            jid,
            text: params.content ?? '',
            type: messageType,
            mediaUrl: params.mediaUrl ?? null,
            mediaMime: params.mediaMime ?? null,
            mediaSize: params.mediaSize ?? null,
        }, {
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.info({
            tenantId: params.tenantId,
            messageId: message.id,
            jid,
        }, 'QUEUE PUSH');
        this.logger.info({ conversationId: conversation.id, messageId: message.id }, 'Outbound message sent');
        return message;
    }
    async updateMessageStatus(externalId, status) {
        await this.processor.updateMessageStatus(externalId, status);
        if (status === client_1.MessageStatus.FAILED) {
            const message = await this.prisma.message.findUnique({
                where: { external_id: externalId },
            });
            if (message) {
                await this.processor.publishMessageFailed({
                    tenant_id: message.tenant_id,
                    id: message.id,
                    conversation_id: message.conversation_id,
                    contact_id: message.contact_id,
                    content: message.content,
                    type: message.type,
                    media_url: message.media_url,
                    media_mime: message.media_mime,
                    media_size: message.media_size,
                    timestamp: message.timestamp,
                });
                this.logger.warn({ messageId: message.id }, 'Outbound message failed');
            }
        }
    }
    async downloadAndStoreMedia(message, normalized, reuploadRequest) {
        try {
            const downloaded = await (0, baileys_1.downloadMediaMessage)(message, 'buffer', {}, {
                logger: this.logger,
                reuploadRequest: reuploadRequest
                    ? reuploadRequest
                    : async () => {
                        throw new Error('Media reupload unavailable');
                    },
            });
            const buffer = Buffer.isBuffer(downloaded)
                ? downloaded
                : Buffer.from(downloaded);
            const result = await this.storage.saveMedia(buffer, {
                filename: normalized.mediaFileName ?? undefined,
                contentType: normalized.mediaMime ?? undefined,
                sizeBytes: normalized.mediaSize ?? undefined,
                extension: normalized.mediaExtension ?? undefined,
            });
            return result.publicUrl;
        }
        catch (error) {
            const messageText = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: messageText }, 'Failed to download media');
            return null;
        }
    }
    buildJid(raw) {
        if (raw.includes('@')) {
            return raw;
        }
        const digits = raw.replace(/[^\d]/g, '');
        if (!digits) {
            return raw;
        }
        return `${digits}@c.us`;
    }
    async sendQueuedMessage(payload) {
        const tenantId = payload.tenantId;
        if (!tenantId) {
            throw new common_1.BadRequestException('Missing tenantId');
        }
        const session = await this.prisma.whatsappSession.findFirst({
            where: {
                tenant_id: tenantId,
                status: client_1.ConnectionStatus.CONNECTED,
            },
        });
        if (!session) {
            throw new common_1.ServiceUnavailableException('No active WhatsApp session');
        }
        let client = this.sessionManager.getClientByTenant(tenantId);
        if (!client) {
            await this.sessionManager.startSession(session);
            client = await this.waitForClient(tenantId, 10, 500);
        }
        if (!client) {
            throw new common_1.ServiceUnavailableException('WhatsApp client unavailable');
        }
        const jid = this.buildJid(payload.jid);
        const mediaUrl = this.resolveMediaUrl(payload.mediaUrl ?? null);
        const sendPayload = this.buildSendPayload(payload.type ?? 'text', payload.text, mediaUrl, payload.mediaMime ?? undefined);
        this.logger.info({ tenantId, messageId: payload.messageId, jid }, 'BAILEYS SEND (API)');
        const response = await client.sendMessage(jid, sendPayload);
        const externalId = response?.key?.id;
        if (payload.messageId && externalId) {
            await this.prisma.message.update({
                where: { id: payload.messageId },
                data: { external_id: externalId, status: client_1.MessageStatus.SENT },
            });
        }
        return { externalId };
    }
    buildSendPayload(type, content, mediaUrl, mediaMime) {
        switch (type) {
            case 'image':
                return { image: { url: mediaUrl ?? '' }, caption: content };
            case 'video':
                return { video: { url: mediaUrl ?? '' }, caption: content };
            case 'audio':
                return { audio: { url: mediaUrl ?? '' }, mimetype: mediaMime };
            case 'document':
                return {
                    document: { url: mediaUrl ?? '' },
                    caption: content,
                    mimetype: mediaMime || 'application/pdf',
                };
            default:
                return { text: content ?? '' };
        }
    }
    resolveMediaUrl(url) {
        if (!url) {
            return null;
        }
        if (url.startsWith('/media/')) {
            const storageKey = url.replace('/media/', '');
            const { storageLocalPath } = (0, config_1.getConfig)();
            return path_1.default.resolve(storageLocalPath, storageKey);
        }
        return url;
    }
    async waitForClient(tenantId, attempts, delayMs) {
        for (let index = 0; index < attempts; index += 1) {
            const client = this.sessionManager.getClientByTenant(tenantId);
            if (client) {
                return client;
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return null;
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => session_manager_1.SessionManager))),
    __param(5, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        message_normalizer_1.MessageNormalizer,
        message_processor_1.MessageProcessor,
        session_manager_1.SessionManager,
        storage_service_1.StorageService, Function])
], MessagesService);
