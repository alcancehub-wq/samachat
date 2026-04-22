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
exports.DialogVariablesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DialogVariablesService = class DialogVariablesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listVariables(tenantId) {
        return this.prisma.dialogVariable.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'desc' },
        });
    }
    async createVariable(tenantId, input) {
        this.validateInput(input);
        return this.prisma.dialogVariable.create({
            data: {
                tenant_id: tenantId,
                name: input.name.trim(),
                placeholder: input.placeholder.trim(),
                description: input.description?.trim() || null,
            },
        });
    }
    async updateVariable(tenantId, id, input) {
        const existing = await this.prisma.dialogVariable.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Variable not found');
        }
        const next = {
            name: input.name ?? existing.name,
            placeholder: input.placeholder ?? existing.placeholder,
            description: input.description ?? existing.description,
        };
        this.validateInput(next);
        return this.prisma.dialogVariable.update({
            where: { id: existing.id },
            data: {
                name: next.name.trim(),
                placeholder: next.placeholder.trim(),
                description: next.description?.trim() || null,
            },
        });
    }
    async deleteVariable(tenantId, id, force = false) {
        const existing = await this.prisma.dialogVariable.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Variable not found');
        }
        const usage = await this.getUsageCounts(tenantId, existing.placeholder);
        const totalUsage = usage.dialogs + usage.campaigns + usage.templates;
        if (totalUsage > 0 && !force) {
            throw new common_1.ConflictException({
                message: 'Variable in use',
                usage,
            });
        }
        await this.prisma.dialogVariable.delete({ where: { id: existing.id } });
        return { id: existing.id };
    }
    validateInput(input) {
        if (!input.name || !input.name.trim()) {
            throw new common_1.BadRequestException('Variable name is required');
        }
        if (!input.placeholder || !input.placeholder.trim()) {
            throw new common_1.BadRequestException('Variable placeholder is required');
        }
        const trimmed = input.placeholder.trim();
        const valid = /^\{\{[a-zA-Z0-9_]+\}\}$/.test(trimmed);
        if (!valid) {
            throw new common_1.BadRequestException('Placeholder must use {{name}} format');
        }
    }
    async getUsageCounts(tenantId, placeholder) {
        const dialogMessageCount = await this.prisma.dialog.count({
            where: {
                tenant_id: tenantId,
                message_text: {
                    contains: placeholder,
                },
            },
        });
        const templateRows = await this.prisma.$queryRaw(client_1.Prisma.sql `SELECT COUNT(*)::int AS count
        FROM "Dialog"
        WHERE tenant_id = ${tenantId}
          AND template_variables::text ILIKE ${`%${placeholder}%`}`);
        const templateCount = templateRows[0]?.count ?? 0;
        const campaignCount = await this.prisma.campaign.count({
            where: {
                tenant_id: tenantId,
                message_content: {
                    contains: placeholder,
                },
            },
        });
        return {
            dialogs: dialogMessageCount,
            templates: templateCount,
            campaigns: campaignCount,
        };
    }
};
exports.DialogVariablesService = DialogVariablesService;
exports.DialogVariablesService = DialogVariablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DialogVariablesService);
