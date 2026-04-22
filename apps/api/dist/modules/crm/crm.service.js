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
exports.CrmService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const session_store_1 = require("../connections/session.store");
const logger_1 = require("@samachat/logger");
let CrmService = class CrmService {
    prisma;
    redis;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'crm' });
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async createLead(params) {
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                id: params.conversation_id,
                tenant_id: params.tenant_id,
            },
            include: { contact: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        if (conversation.crm_contact_id || conversation.crm_deal_id) {
            return {
                contact_id: conversation.crm_contact_id || '',
                deal_id: conversation.crm_deal_id || '',
                pipeline_id: `pipeline:${params.user_id}`,
                already_linked: true,
            };
        }
        const contactId = this.createContact({
            tenantId: params.tenant_id,
            phoneNumber: conversation.contact.phone_number,
            name: conversation.contact.name,
            conversationId: conversation.id,
        });
        const dealId = this.createDeal({
            tenantId: params.tenant_id,
            contactId,
            conversationId: conversation.id,
        });
        const pipelineId = `pipeline:${params.user_id}`;
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                crm_contact_id: contactId,
                crm_deal_id: dealId,
            },
        });
        const result = {
            contact_id: contactId,
            deal_id: dealId,
            pipeline_id: pipelineId,
        };
        await this.redis.publish('samachat.events', JSON.stringify({
            event: 'crm_deal_created',
            payload: {
                tenant_id: params.tenant_id,
                conversation_id: conversation.id,
                contact_id: conversation.contact_id,
                crm_contact_id: contactId,
                crm_deal_id: dealId,
                pipeline_id: pipelineId,
                timestamp: new Date().toISOString(),
            },
        }));
        this.logger.info({ conversationId: conversation.id, crmDealId: dealId }, 'CRM lead created');
        return result;
    }
    createContact(params) {
        return `crm-contact:${(0, crypto_1.randomUUID)()}`;
    }
    createDeal(params) {
        return `crm-deal:${(0, crypto_1.randomUUID)()}`;
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Function])
], CrmService);
