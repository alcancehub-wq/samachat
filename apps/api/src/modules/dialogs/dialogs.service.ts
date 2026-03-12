import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { DialogInput } from './types';

@Injectable()
export class DialogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDialogs(tenantId: string) {
    return this.prisma.dialog.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDialog(tenantId: string, id: string) {
    const dialog = await this.prisma.dialog.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!dialog) {
      throw new NotFoundException('Dialog not found');
    }
    return dialog;
  }

  async createDialog(tenantId: string, input: DialogInput) {
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
        template_variables:
          templateVariables === null ? Prisma.JsonNull : (templateVariables as Prisma.InputJsonValue),
        automation_actions:
          automationActions === null ? Prisma.JsonNull : (automationActions as Prisma.InputJsonValue),
      },
    });
  }

  async updateDialog(tenantId: string, id: string, input: Partial<DialogInput>) {
    const existing = await this.prisma.dialog.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Dialog not found');
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
    } as DialogInput;

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
        template_variables:
          merged.template_variables === null
            ? Prisma.JsonNull
            : (merged.template_variables as Prisma.InputJsonValue),
        automation_actions:
          merged.automation_actions === null
            ? Prisma.JsonNull
            : (merged.automation_actions as Prisma.InputJsonValue),
      },
    });
  }

  async deleteDialog(tenantId: string, id: string) {
    const existing = await this.prisma.dialog.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Dialog not found');
    }

    const usedByCampaign = await this.prisma.campaign.findFirst({
      where: { dialog_id: existing.id, tenant_id: tenantId },
      select: { id: true },
    });

    if (usedByCampaign) {
      throw new BadRequestException('Dialog in use by campaigns');
    }

    await this.prisma.dialog.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }

  private validateInput(input: DialogInput) {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('Dialog name is required');
    }

    if (input.type === 'message') {
      if (!input.message_text || !input.message_text.trim()) {
        throw new BadRequestException('Message text is required');
      }
    }

    if (input.type === 'template') {
      if (!input.template_name?.trim()) {
        throw new BadRequestException('Template name is required');
      }
      if (!input.template_id?.trim()) {
        throw new BadRequestException('Template ID is required');
      }
      if (!input.template_language?.trim()) {
        throw new BadRequestException('Template language is required');
      }
    }

    if (input.type === 'automation') {
      const actions = input.automation_actions ?? [];
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new BadRequestException('Automation actions are required');
      }
    }
  }
}
