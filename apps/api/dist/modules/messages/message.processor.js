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
exports.MessageProcessor = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const logger_1 = require("@samachat/logger");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const session_store_1 = require("../connections/session.store");
let MessageProcessor = class MessageProcessor {
    prisma;
    redis;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'messages' });
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async processInboundMessage(tenantId, normalized) {
        const contact = await this.prisma.contact.upsert({
            where: { phone_number: normalized.phoneNumber },
            update: {},
            create: {
                phone_number: normalized.phoneNumber,
                name: null,
            },
        });
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                tenant_id: tenantId,
                contact_id: contact.id,
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    tenant_id: tenantId,
                    contact_id: contact.id,
                    status: client_1.ConversationStatus.open,
                },
            });
            await this.publishConversationCreated({
                tenant_id: tenantId,
                conversation_id: conversation.id,
                contact_id: contact.id,
            });
        }
        const bodyFallback = normalized.mediaType ? `[${normalized.mediaType}]` : '';
        let message;
        try {
            message = await this.prisma.message.create({
                data: {
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    contact_id: contact.id,
                    direction: client_1.MessageDirection.INBOUND,
                    type: normalized.messageType,
                    content: normalized.messageText,
                    media_url: normalized.mediaUrl ?? null,
                    media_type: normalized.mediaType ?? null,
                    media_mime: normalized.mediaMime ?? null,
                    media_size: normalized.mediaSize ?? null,
                    status: client_1.MessageStatus.DELIVERED,
                    external_id: normalized.externalId,
                    timestamp: normalized.timestamp,
                    body: normalized.messageText || bodyFallback,
                },
            });
        }
        catch (error) {
            if (this.isDuplicateError(error)) {
                return;
            }
            throw error;
        }
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                last_message_id: message.id,
                last_message_at: message.timestamp,
            },
        });
        const payload = {
            tenant_id: tenantId,
            conversation_id: conversation.id,
            contact_id: contact.id,
            message_id: message.id,
            direction: message.direction,
            content: message.content,
            type: message.type,
            media_url: message.media_url,
            media_mime: message.media_mime,
            media_size: message.media_size,
            timestamp: message.timestamp.toISOString(),
        };
        await this.redis.publish('samachat.events', JSON.stringify({
            event: 'message_received',
            payload,
        }));
        this.logger.info({ conversationId: conversation.id, messageId: message.id }, 'Inbound message received');
    }
    async createOutboundPlaceholder(params) {
        const contact = await this.prisma.contact.upsert({
            where: { phone_number: params.contactPhone },
            update: {},
            create: { phone_number: params.contactPhone, name: null },
        });
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                tenant_id: params.tenantId,
                contact_id: contact.id,
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    tenant_id: params.tenantId,
                    contact_id: contact.id,
                    status: client_1.ConversationStatus.open,
                },
            });
            await this.publishConversationCreated({
                tenant_id: params.tenantId,
                conversation_id: conversation.id,
                contact_id: contact.id,
            });
        }
        const message = await this.prisma.message.create({
            data: {
                tenant_id: params.tenantId,
                conversation_id: conversation.id,
                contact_id: contact.id,
                direction: client_1.MessageDirection.OUTBOUND,
                type: params.messageType || 'text',
                content: params.content ?? null,
                media_url: params.mediaUrl ?? null,
                media_type: params.messageType && params.messageType !== 'text' ? params.messageType : null,
                media_mime: params.mediaMime ?? null,
                media_size: params.mediaSize ?? null,
                status: client_1.MessageStatus.PENDING,
                external_id: params.externalId || `outbound:${Date.now()}:${contact.id}`,
                timestamp: new Date(),
                body: params.content ?? (params.messageType && params.messageType !== 'text'
                    ? `[${params.messageType}]`
                    : ''),
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                last_message_id: message.id,
                last_message_at: message.timestamp,
            },
        });
        return message;
    }
    async updateMessageStatus(externalId, status) {
        await this.prisma.message.updateMany({
            where: { external_id: externalId },
            data: { status },
        });
    }
    async publishMessageSent(message) {
        const payload = {
            tenant_id: message.tenant_id,
            conversation_id: message.conversation_id,
            contact_id: message.contact_id,
            message_id: message.id,
            direction: message.direction,
            content: message.content,
            type: message.type ?? undefined,
            media_url: message.media_url ?? undefined,
            media_mime: message.media_mime ?? undefined,
            media_size: message.media_size ?? undefined,
            timestamp: message.timestamp.toISOString(),
            sender_id: message.sender_user_id ?? null,
            sender_name: message.senderName ?? null,
        };
        await this.redis.publish('samachat.events', JSON.stringify({
            event: 'message_sent',
            payload,
        }));
    }
    async publishMessageFailed(message) {
        await this.redis.publish('samachat.events', JSON.stringify({
            event: 'message_failed',
            payload: {
                tenant_id: message.tenant_id,
                conversation_id: message.conversation_id,
                contact_id: message.contact_id,
                message_id: message.id,
                content: message.content,
                type: message.type ?? undefined,
                media_url: message.media_url ?? undefined,
                media_mime: message.media_mime ?? undefined,
                media_size: message.media_size ?? undefined,
                timestamp: message.timestamp.toISOString(),
            },
        }));
    }
    async publishConversationCreated(payload) {
        await this.redis.publish('samachat.events', JSON.stringify({
            event: 'conversation_created',
            payload: {
                ...payload,
                timestamp: new Date().toISOString(),
            },
        }));
    }
    isDuplicateError(error) {
        return (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002');
    }
};
exports.MessageProcessor = MessageProcessor;
exports.MessageProcessor = MessageProcessor = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Function])
], MessageProcessor);
