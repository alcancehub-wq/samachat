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
exports.DialogsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DialogsService = class DialogsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listDialogs(tenantId) {
        return this.prisma.dialog.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'desc' },
        });
    }
    async getDialog(tenantId, id) {
        const dialog = await this.prisma.dialog.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!dialog) {
            throw new common_1.NotFoundException('Dialog not found');
        }
        return dialog;
    }
    async createDialog(tenantId, input) {
        this.validateInput(input);
        const templateVariables = input.template_variables ?? null;
        const automationActions = input.automation_actions ?? null;
        return this.prisma.dialog.create({
            data: {
                tenant_id: tenantId,
                name: input.name.trim(),
                group_name: input.group_name?.trim() || null,
                type: input.type,
                channel: input.channel ?? 'whatsapp',
                status: input.status ?? 'active',
                message_text: input.message_text?.trim() || null,
                media_url: input.media_url ?? null,
                template_name: input.template_name?.trim() || null,
                template_id: input.template_id?.trim() || null,
                template_language: input.template_language?.trim() || null,
                template_variables: templateVariables === null ? client_1.Prisma.JsonNull : templateVariables,
                automation_actions: automationActions === null ? client_1.Prisma.JsonNull : automationActions,
            },
        });
    }
    async updateDialog(tenantId, id, input) {
        const existing = await this.prisma.dialog.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Dialog not found');
        }
        const merged = {
            ...existing,
            ...input,
            group_name: input.group_name ?? existing.group_name,
            message_text: input.message_text ?? existing.message_text,
            template_name: input.template_name ?? existing.template_name,
            template_id: input.template_id ?? existing.template_id,
            template_language: input.template_language ?? existing.template_language,
            template_variables: input.template_variables ?? existing.template_variables,
            automation_actions: input.automation_actions ?? existing.automation_actions,
        };
        this.validateInput(merged);
        return this.prisma.dialog.update({
            where: { id: existing.id },
            data: {
                name: (input.name ?? existing.name).trim(),
                group_name: input.group_name?.trim() || null,
                type: input.type ?? existing.type,
                channel: input.channel ?? existing.channel,
                status: input.status ?? existing.status,
                message_text: input.message_text?.trim() || null,
                media_url: input.media_url ?? existing.media_url,
                template_name: input.template_name?.trim() || null,
                template_id: input.template_id?.trim() || null,
                template_language: input.template_language?.trim() || null,
                template_variables: merged.template_variables === null
                    ? client_1.Prisma.JsonNull
                    : merged.template_variables,
                automation_actions: merged.automation_actions === null
                    ? client_1.Prisma.JsonNull
                    : merged.automation_actions,
            },
        });
    }
    async deleteDialog(tenantId, id) {
        const existing = await this.prisma.dialog.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Dialog not found');
        }
        const usedByCampaign = await this.prisma.campaign.findFirst({
            where: { dialog_id: existing.id, tenant_id: tenantId },
            select: { id: true },
        });
        if (usedByCampaign) {
            throw new common_1.BadRequestException('Dialog in use by campaigns');
        }
        await this.prisma.dialog.delete({ where: { id: existing.id } });
        return { id: existing.id };
    }
    validateInput(input) {
        if (!input.name || !input.name.trim()) {
            throw new common_1.BadRequestException('Dialog name is required');
        }
        if (input.type === 'message') {
            if (!input.message_text || !input.message_text.trim()) {
                throw new common_1.BadRequestException('Message text is required');
            }
        }
        if (input.type === 'template') {
            if (!input.template_name?.trim()) {
                throw new common_1.BadRequestException('Template name is required');
            }
            if (!input.template_id?.trim()) {
                throw new common_1.BadRequestException('Template ID is required');
            }
            if (!input.template_language?.trim()) {
                throw new common_1.BadRequestException('Template language is required');
            }
        }
        if (input.type === 'automation') {
            const actions = input.automation_actions ?? [];
            if (!Array.isArray(actions) || actions.length === 0) {
                throw new common_1.BadRequestException('Automation actions are required');
            }
        }
    }
};
exports.DialogsService = DialogsService;
exports.DialogsService = DialogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DialogsService);
