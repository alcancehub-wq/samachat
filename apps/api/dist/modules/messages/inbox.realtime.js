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
exports.InboxRealtimeService = void 0;
const common_1 = require("@nestjs/common");
const logger_1 = require("@samachat/logger");
const session_store_1 = require("../connections/session.store");
const inbox_gateway_1 = require("./inbox.gateway");
let InboxRealtimeService = class InboxRealtimeService {
    redis;
    gateway;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'inbox-realtime' });
    subscriber;
    constructor(redis, gateway) {
        this.redis = redis;
        this.gateway = gateway;
    }
    async onModuleInit() {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe('samachat.events');
        this.subscriber.on('message', (_channel, rawMessage) => {
            try {
                const parsed = JSON.parse(rawMessage);
                const event = parsed.event;
                const payload = parsed.payload ?? {};
                if (event === 'message_received') {
                    this.gateway.emitMessageReceived(payload);
                }
                if (event === 'message_sent') {
                    this.gateway.emitMessageSent(payload);
                }
                if (event === 'message_received' || event === 'message_sent') {
                    const conversationId = payload.conversation_id;
                    if (conversationId) {
                        this.gateway.emitConversationUpdated({ conversation_id: conversationId });
                    }
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ error: message }, 'Failed to parse inbox event');
            }
        });
    }
    async onModuleDestroy() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe('samachat.events');
            await this.subscriber.quit();
        }
    }
};
exports.InboxRealtimeService = InboxRealtimeService;
exports.InboxRealtimeService = InboxRealtimeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(session_store_1.CONNECTIONS_REDIS)),
    __metadata("design:paramtypes", [Function, inbox_gateway_1.InboxGateway])
], InboxRealtimeService);
