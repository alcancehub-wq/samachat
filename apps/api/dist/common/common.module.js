"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("@samachat/config");
const prisma_service_1 = require("./prisma/prisma.service");
const tenant_guard_1 = require("./guards/tenant.guard");
const rbac_guard_1 = require("./guards/rbac.guard");
const session_store_1 = require("../modules/connections/session.store");
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            prisma_service_1.PrismaService,
            tenant_guard_1.TenantGuard,
            rbac_guard_1.RbacGuard,
            {
                provide: session_store_1.CONNECTIONS_REDIS,
                useFactory: () => {
                    const redisUrl = (0, config_1.requireRedisUrl)();
                    return new ioredis_1.default(redisUrl, {
                        maxRetriesPerRequest: null,
                        enableReadyCheck: false,
                    });
                },
            },
        ],
        exports: [prisma_service_1.PrismaService, tenant_guard_1.TenantGuard, rbac_guard_1.RbacGuard, session_store_1.CONNECTIONS_REDIS],
    })
], CommonModule);
