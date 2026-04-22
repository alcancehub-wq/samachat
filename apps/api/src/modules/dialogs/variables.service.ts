import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface VariableInput {
  name: string;
  placeholder: string;
  description?: string | null;
}

@Injectable()
export class DialogVariablesService {
  constructor(private readonly prisma: PrismaService) {}

  async listVariables(tenantId: string) {
    return this.prisma.dialogVariable.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  async createVariable(tenantId: string, input: VariableInput) {
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

  async updateVariable(tenantId: string, id: string, input: Partial<VariableInput>) {
    const existing = await this.prisma.dialogVariable.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Variable not found');
    }

    const next: VariableInput = {
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

  async deleteVariable(tenantId: string, id: string, force = false) {
    const existing = await this.prisma.dialogVariable.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Variable not found');
    }

    const usage = await this.getUsageCounts(tenantId, existing.placeholder);
    const totalUsage = usage.dialogs + usage.campaigns + usage.templates;

    if (totalUsage > 0 && !force) {
      throw new ConflictException({
        message: 'Variable in use',
        usage,
      });
    }

    await this.prisma.dialogVariable.delete({ where: { id: existing.id } });
    return { id: existing.id };
  }

  private validateInput(input: VariableInput) {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('Variable name is required');
    }
    if (!input.placeholder || !input.placeholder.trim()) {
      throw new BadRequestException('Variable placeholder is required');
    }
    const trimmed = input.placeholder.trim();
    const valid = /^\{\{[a-zA-Z0-9_]+\}\}$/.test(trimmed);
    if (!valid) {
      throw new BadRequestException('Placeholder must use {{name}} format');
    }
  }

  private async getUsageCounts(tenantId: string, placeholder: string) {
    const dialogMessageCount = await this.prisma.dialog.count({
      where: {
        tenant_id: tenantId,
        message_text: {
          contains: placeholder,
        },
      },
    });

    const templateRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS count
        FROM "Dialog"
        WHERE tenant_id = ${tenantId}
          AND template_variables::text ILIKE ${`%${placeholder}%`}`,
    );
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
}
