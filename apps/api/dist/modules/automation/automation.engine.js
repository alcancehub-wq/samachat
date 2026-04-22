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
exports.AutomationEngine = void 0;
const common_1 = require("@nestjs/common");
const logger_1 = require("@samachat/logger");
const session_store_1 = require("../connections/session.store");
const automation_service_1 = require("./automation.service");
const messages_service_1 = require("../messages/messages.service");
const crm_service_1 = require("../crm/crm.service");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AutomationEngine = class AutomationEngine {
    redis;
    automationService;
    messagesService;
    crmService;
    prisma;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'automation-engine' });
    subscriber;
    constructor(redis, automationService, messagesService, crmService, prisma) {
        this.redis = redis;
        this.automationService = automationService;
        this.messagesService = messagesService;
        this.crmService = crmService;
        this.prisma = prisma;
    }
    async onModuleInit() {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('samachat.events');
        this.subscriber.on('message', (_channel, rawMessage) => {
            void this.handleEvent(rawMessage);
        });
    }
    async onModuleDestroy() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe('samachat.events');
            await this.subscriber.quit();
        }
    }
    async handleEvent(rawMessage) {
        let envelope;
        try {
            envelope = JSON.parse(rawMessage);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn({ error: message }, 'Failed to parse automation event');
            return;
        }
        const event = envelope.event;
        const payload = envelope.payload ?? {};
        if (!event) {
            return;
        }
        const tenantId = await this.resolveTenantId(payload);
        const conversationId = payload.conversation_id;
        if (!tenantId) {
            this.logger.warn({ event }, 'Automation event missing tenant_id');
            return;
        }
        const automations = await this.automationService.listActiveByTrigger(tenantId, event);
        if (automations.length === 0) {
            return;
        }
        for (const automation of automations) {
            for (const action of automation.actions) {
                try {
                    await this.executeAction({
                        tenantId,
                        conversationId,
                        actionType: action.action_type,
                        payload: action.payload,
                    });
                    await this.redis.publish('samachat.events', JSON.stringify({
                        event: 'automation_executed',
                        payload: {
                            tenant_id: tenantId,
                            automation_id: automation.id,
                            action_type: action.action_type,
                            conversation_id: conversationId,
                            timestamp: new Date().toISOString(),
                        },
                    }));
                    this.logger.info({ automationId: automation.id, action: action.action_type }, 'Automation action executed');
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.warn({ automationId: automation.id, action: action.action_type, error: message }, 'Automation action failed');
                    await this.redis.publish('samachat.events', JSON.stringify({
                        event: 'automation_failed',
                        payload: {
                            tenant_id: tenantId,
                            automation_id: automation.id,
                            action_type: action.action_type,
                            conversation_id: conversationId,
                            error: message,
                            timestamp: new Date().toISOString(),
                        },
                    }));
                }
            }
        }
    }
    async resolveTenantId(payload) {
        const direct = payload.tenant_id;
        if (typeof direct === 'string') {
            return direct;
        }
        const conversationId = payload.conversation_id;
        if (typeof conversationId !== 'string') {
            return null;
        }
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        return conversation?.tenant_id ?? null;
    }
    async executeAction(params) {
        if (params.actionType === 'send_message') {
            if (!params.conversationId) {
                throw new Error('Missing conversation_id for send_message');
            }
            const content = String(params.payload.content ?? '');
            if (!content) {
                return;
            }
            await this.messagesService.sendWhatsAppMessage({
                tenantId: params.tenantId,
                conversationId: params.conversationId,
                content,
            });
            return;
        }
        if (params.actionType === 'create_crm_deal') {
            if (!params.conversationId) {
                throw new Error('Missing conversation_id for create_crm_deal');
            }
            await this.crmService.createLead({
                tenant_id: params.tenantId,
                user_id: 'automation',
                conversation_id: params.conversationId,
            });
            return;
        }
        if (params.actionType === 'call_webhook') {
            const url = String(params.payload.url ?? '');
            if (!url) {
                return;
            }
            const method = String(params.payload.method ?? 'POST').toUpperCase();
            const body = params.payload.body ?? params.payload;
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        }
    }
};
exports.AutomationEngine = AutomationEngine;
exports.AutomationEngine = AutomationEngine = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function, automation_service_1.AutomationService,
        messages_service_1.MessagesService,
        crm_service_1.CrmService,
        prisma_service_1.PrismaService])
], AutomationEngine);
