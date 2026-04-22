import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AutomationInput } from './types';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async listAutomations(tenantId: string) {
    return this.prisma.automation.findMany({
      where: { tenant_id: tenantId },
      include: { actions: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async listActiveByTrigger(tenantId: string, triggerType: string) {
    return this.prisma.automation.findMany({
      where: {
        tenant_id: tenantId,
        trigger_type: triggerType,
        is_active: true,
      },
      include: { actions: true },
    });
  }

  async createAutomation(tenantId: string, input: AutomationInput) {
    return this.prisma.automation.create({
      data: {
        tenant_id: tenantId,
        name: input.name,
        trigger_type: input.trigger_type,
        is_active: input.is_active ?? true,
        actions: {
          create: input.actions.map((action) => ({
            action_type: action.action_type,
            payload: action.payload as Prisma.InputJsonValue,
          })),
        },
      },
      include: { actions: true },
    });
  }

  async updateAutomation(
    tenantId: string,
    id: string,
    input: Partial<AutomationInput>,
  ) {
    const existing = await this.prisma.automation.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Automation not found');
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
                  payload: action.payload as Prisma.InputJsonValue,
                })),
              }
            : undefined,
        },
        include: { actions: true },
      });
    });
  }

  async deleteAutomation(tenantId: string, id: string) {
    const existing = await this.prisma.automation.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Automation not found');
    }

    await this.prisma.automationAction.deleteMany({
      where: { automation_id: id },
    });

    return this.prisma.automation.delete({
      where: { id },
    });
  }
}
