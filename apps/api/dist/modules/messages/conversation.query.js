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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationQuery = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ConversationQuery = class ConversationQuery {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listConversations(tenantId) {
        const conversations = await this.prisma.conversation.findMany({
            where: { tenant_id: tenantId },
            include: {
                contact: true,
                last_message: true,
            },
            orderBy: {
                last_message_at: 'desc',
            },
        });
        return conversations.map((conversation) => ({
            conversation_id: conversation.id,
            contact_name: conversation.contact.name,
            phone_number: conversation.contact.phone_number,
            last_message: conversation.last_message?.content ?? conversation.last_message?.body ?? null,
            last_message_at: this.toIsoString(conversation.last_message_at ?? conversation.last_message?.timestamp ?? null),
            unread_count: 0,
        }));
    }
    async listMessages(params) {
        const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
        const messages = await this.prisma.message.findMany({
            where: {
                tenant_id: params.tenantId,
                conversation_id: params.conversationId,
            },
            orderBy: {
                timestamp: 'asc',
            },
            take,
            skip: params.cursor ? 1 : 0,
            cursor: params.cursor ? { id: params.cursor } : undefined,
        });
        const nextCursor = messages.length === take ? messages[messages.length - 1]?.id : null;
        return {
            items: messages.map((message) => ({
                message_id: message.id,
                direction: message.direction,
                content: message.content,
                type: message.type,
                media_url: message.media_url,
                media_mime: message.media_mime,
                media_size: message.media_size,
                timestamp: message.timestamp.toISOString(),
                status: message.status,
            })),
            next_cursor: nextCursor,
        };
    }
    toIsoString(value) {
        if (!value) {
            return null;
        }
        return value.toISOString();
    }
};
exports.ConversationQuery = ConversationQuery;
exports.ConversationQuery = ConversationQuery = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationQuery);
