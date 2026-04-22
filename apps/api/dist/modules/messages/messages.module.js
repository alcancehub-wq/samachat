"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesModule = void 0;
const common_1 = require("@nestjs/common");
const message_normalizer_1 = require("./message.normalizer");
const message_processor_1 = require("./message.processor");
const messages_service_1 = require("./messages.service");
const messages_controller_1 = require("./messages.controller");
const connections_module_1 = require("../connections/connections.module");
const conversation_query_1 = require("./conversation.query");
const inbox_gateway_1 = require("./inbox.gateway");
const inbox_realtime_1 = require("./inbox.realtime");
const storage_module_1 = require("../../storage/storage.module");
let MessagesModule = class MessagesModule {
};
exports.MessagesModule = MessagesModule;
exports.MessagesModule = MessagesModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => connections_module_1.ConnectionsModule), storage_module_1.StorageModule],
        controllers: [messages_controller_1.MessagesController],
        providers: [
            message_normalizer_1.MessageNormalizer,
            message_processor_1.MessageProcessor,
            messages_service_1.MessagesService,
            conversation_query_1.ConversationQuery,
            inbox_gateway_1.InboxGateway,
            inbox_realtime_1.InboxRealtimeService,
        ],
        exports: [messages_service_1.MessagesService, conversation_query_1.ConversationQuery],
    })
], MessagesModule);
