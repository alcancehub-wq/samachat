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
exports.AutomationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AutomationService = class AutomationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listAutomations(tenantId) {
        return this.prisma.automation.findMany({
            where: { tenant_id: tenantId },
            include: { actions: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async listActiveByTrigger(tenantId, triggerType) {
        return this.prisma.automation.findMany({
            where: {
                tenant_id: tenantId,
                trigger_type: triggerType,
                is_active: true,
            },
            include: { actions: true },
        });
    }
    async createAutomation(tenantId, input) {
        return this.prisma.automation.create({
            data: {
                tenant_id: tenantId,
                name: input.name,
                trigger_type: input.trigger_type,
                is_active: input.is_active ?? true,
                actions: {
                    create: input.actions.map((action) => ({
                        action_type: action.action_type,
                        payload: action.payload,
                    })),
                },
            },
            include: { actions: true },
        });
    }
    async updateAutomation(tenantId, id, input) {
        const existing = await this.prisma.automation.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Automation not found');
        }
        return this.prisma.$transaction(async (tx) => {
            if (input.actions) {
                await tx.automationAction.deleteMany({
                    where: { automation_id: id },
                });
            }
            return tx.automation.update({
                where: { id },
                data: {
                    name: input.name ?? existing.name,
                    trigger_type: input.trigger_type ?? existing.trigger_type,
                    is_active: input.is_active ?? existing.is_active,
                    actions: input.actions
                        ? {
                            create: input.actions.map((action) => ({
                                action_type: action.action_type,
                                payload: action.payload,
                            })),
                        }
                        : undefined,
                },
                include: { actions: true },
            });
        });
    }
    async deleteAutomation(tenantId, id) {
        const existing = await this.prisma.automation.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Automation not found');
        }
        await this.prisma.automationAction.deleteMany({
            where: { automation_id: id },
        });
        return this.prisma.automation.delete({
            where: { id },
        });
    }
};
exports.AutomationService = AutomationService;
exports.AutomationService = AutomationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutomationService);
