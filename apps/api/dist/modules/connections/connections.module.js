"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionsModule = void 0;
const common_1 = require("@nestjs/common");
const connections_controller_1 = require("./connections.controller");
const connections_service_1 = require("./connections.service");
const connection_gateway_1 = require("./connection.gateway");
const session_manager_1 = require("./session.manager");
const session_store_1 = require("./session.store");
const connection_pool_manager_1 = require("./connection-pool.manager");
const messages_module_1 = require("../messages/messages.module");
const metrics_module_1 = require("../../metrics/metrics.module");
let ConnectionsModule = class ConnectionsModule {
};
exports.ConnectionsModule = ConnectionsModule;
exports.ConnectionsModule = ConnectionsModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => messages_module_1.MessagesModule), metrics_module_1.MetricsModule],
        controllers: [connections_controller_1.ConnectionsController],
        providers: [connections_service_1.ConnectionsService, connection_gateway_1.ConnectionGateway, session_manager_1.SessionManager, session_store_1.SessionStore, connection_pool_manager_1.ConnectionPoolManager],
        exports: [connection_pool_manager_1.ConnectionPoolManager, session_manager_1.SessionManager],
    })
], ConnectionsModule);
