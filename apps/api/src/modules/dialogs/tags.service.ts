import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface TagInput {
  name: string;
  color_background?: string;
  color_text?: string;
  sort_order?: number;
}

const DEFAULT_TAGS = [
  'LEAD SEM ANDAMENTO',
  'LIVE EMANOEL',
  'Lead Click Aula Secreta',
  'Lead Aula Secreta',
  'Tiktok Lary',
  'Instagram Lary',
  'Compradores - Kit de fechamento',
  'Leads Evento - Elite do Consorcio',
  'Youtube',
  'NO SHOW',
  'AGENDADO',
  'CAMPANHA',
  'Fechamento',
  'instagram',
  'tiktok',
  'QUENTE',
  'IMÓVEL',
  'FECHADO E PAGO',
];

const DEFAULT_BACKGROUND = '#EEF1F5';
const DEFAULT_TEXT = '#2C2F33';

@Injectable()
export class DialogTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags(tenantId: string) {
    let tags = [] as Array<{ id: string; name: string; created_at: Date }>;
    let meta = [] as Array<{ tag_id: string; color_background: string; color_text: string; sort_order: number }>;
    let metaAvailable = true;

    try {
      await this.ensureDefaults(tenantId);
    } catch (error) {
      if (this.isMissingMetaError(error)) {
        await this.ensureDefaultTagRecords(tenantId);
      } else {
        throw error;
      }
    }

    try {
      tags = await this.prisma.tag.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'asc' },
      });
      meta = await this.prisma.dialogTagMeta.findMany({
        where: { tenant_id: tenantId },
      });
    } catch (error) {
      if (this.isMissingMetaError(error)) {
        tags = await this.prisma.tag.findMany({
          where: { tenant_id: tenantId },
          orderBy: { created_at: 'asc' },
        });
        meta = [];
        metaAvailable = false;
      } else {
        throw error;
      }
    }

    const metaByTag = new Map(meta.map((item) => [item.tag_id, item]));
    const maxOrder = meta.reduce((acc, item) => Math.max(acc, item.sort_order), 0);
    let nextOrder = maxOrder + 1;

    for (const tag of tags) {
      if (!metaByTag.has(tag.id) && metaAvailable) {
        try {
          const created = await this.prisma.dialogTagMeta.create({
            data: {
              tenant_id: tenantId,
              tag_id: tag.id,
              color_background: DEFAULT_BACKGROUND,
              color_text: DEFAULT_TEXT,
              sort_order: nextOrder,
            },
          });
          metaByTag.set(tag.id, created);
          nextOrder += 1;
        } catch (error) {
          if (!this.isMissingMetaError(error)) {
            throw error;
          }
          metaAvailable = false;
        }
      }
    }

    return tags
      .map((tag) => {
        const info = metaByTag.get(tag.id);
        return {
          id: tag.id,
          name: tag.name,
          color_background: info?.color_background ?? DEFAULT_BACKGROUND,
          color_text: info?.color_text ?? DEFAULT_TEXT,
          sort_order: info?.sort_order ?? 0,
          created_at: tag.created_at,
        };
      })
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.created_at.getTime() - b.created_at.getTime();
      });
  }

  async createTag(tenantId: string, input: TagInput) {
    if (!input.name || !input.name.trim()) {
      throw new BadRequestException('Tag name is required');
    }

    const background = input.color_background?.trim() || DEFAULT_BACKGROUND;
    const text = input.color_text?.trim() || DEFAULT_TEXT;
    const nextOrder = await this.nextSortOrder(tenantId);
    const metaAvailable = await this.hasMetaTable();

    if (!metaAvailable) {
      const tag = await this.prisma.tag.create({
        data: {
          tenant_id: tenantId,
          name: input.name.trim(),
          color: background,
        },
      });
      return {
        id: tag.id,
        name: tag.name,
        color_background: background,
        color_text: text,
        sort_order: input.sort_order ?? 0,
        created_at: tag.created_at,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.create({
        data: {
          tenant_id: tenantId,
          name: input.name.trim(),
          color: background,
        },
      });
      const meta = await tx.dialogTagMeta.create({
        data: {
          tenant_id: tenantId,
          tag_id: tag.id,
          color_background: background,
          color_text: text,
          sort_order: input.sort_order ?? nextOrder,
        },
      });
      return {
        id: tag.id,
        name: tag.name,
        color_background: meta.color_background,
        color_text: meta.color_text,
        sort_order: meta.sort_order,
        created_at: tag.created_at,
      };
    });
  }

  async updateTag(tenantId: string, id: string, input: TagInput) {
    const existing = await this.prisma.tag.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    const background = input.color_background?.trim();
    const text = input.color_text?.trim();
    const metaAvailable = await this.hasMetaTable();

    if (!metaAvailable) {
      const tag = await this.prisma.tag.update({
        where: { id: existing.id },
        data: {
          name: input.name?.trim() || existing.name,
          color: background ?? existing.color ?? DEFAULT_BACKGROUND,
        },
      });
      return {
        id: tag.id,
        name: tag.name,
        color_background: background ?? DEFAULT_BACKGROUND,
        color_text: text ?? DEFAULT_TEXT,
        sort_order: input.sort_order ?? 0,
        created_at: tag.created_at,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.update({
        where: { id: existing.id },
        data: {
          name: input.name?.trim() || existing.name,
          color: background ?? existing.color ?? DEFAULT_BACKGROUND,
        },
      });

      const meta = await tx.dialogTagMeta.upsert({
        where: { tag_id: existing.id },
        create: {
          tenant_id: tenantId,
          tag_id: existing.id,
          color_background: background ?? DEFAULT_BACKGROUND,
          color_text: text ?? DEFAULT_TEXT,
          sort_order: input.sort_order ?? 0,
        },
        update: {
          color_background: background ?? undefined,
          color_text: text ?? undefined,
          sort_order: typeof input.sort_order === 'number' ? input.sort_order : undefined,
        },
      });

      return {
        id: tag.id,
        name: tag.name,
        color_background: meta.color_background,
        color_text: meta.color_text,
        sort_order: meta.sort_order,
        created_at: tag.created_at,
      };
    });
  }

  async deleteTag(tenantId: string, id: string, force = false) {
    const existing = await this.prisma.tag.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    const usage = await this.getUsageCounts(tenantId, id);
    const totalUsage =
      usage.contacts + usage.conversations + usage.campaigns + usage.automations + usage.dialogs;

    if (totalUsage > 0 && !force) {
      throw new ConflictException({
        message: 'Tag in use',
        usage,
      });
    }

    const metaAvailable = await this.hasMetaTable();

    await this.prisma.$transaction(async (tx) => {
      if (metaAvailable) {
        await tx.dialogTagMeta.deleteMany({ where: { tag_id: existing.id } });
      }
      await tx.contactTag.deleteMany({ where: { tag_id: existing.id, tenant_id: tenantId } });
      await tx.tag.delete({ where: { id: existing.id } });
    });

    return { id: existing.id };
  }

  private async nextSortOrder(tenantId: string) {
    try {
      const maxOrder = await this.prisma.dialogTagMeta.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { sort_order: 'desc' },
        select: { sort_order: true },
      });
      return (maxOrder?.sort_order ?? 0) + 1;
    } catch (error) {
      if (this.isMissingMetaError(error)) {
        return 1;
      }
      throw error;
    }
  }

  private async ensureDefaults(tenantId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true },
    });
    const existingByName = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag]));

    const missing = DEFAULT_TAGS.filter((name) => !existingByName.has(name.toLowerCase()));
    if (missing.length === 0) {
      return;
    }

    await this.prisma.tag.createMany({
      data: missing.map((name) => ({
        tenant_id: tenantId,
        name,
        color: DEFAULT_BACKGROUND,
      })),
      skipDuplicates: true,
    });

    const metaAvailable = await this.hasMetaTable();
    if (!metaAvailable) {
      return;
    }

    const allTags = await this.prisma.tag.findMany({
      where: { tenant_id: tenantId },
      select: { id: true },
    });
    const meta = await this.prisma.dialogTagMeta.findMany({
      where: { tenant_id: tenantId },
      select: { tag_id: true },
    });
    const metaIds = new Set(meta.map((item) => item.tag_id));
    let order = await this.nextSortOrder(tenantId);
    const newMeta = allTags
      .filter((tag) => !metaIds.has(tag.id))
      .map((tag) => ({
        tenant_id: tenantId,
        tag_id: tag.id,
        color_background: DEFAULT_BACKGROUND,
        color_text: DEFAULT_TEXT,
        sort_order: order++,
      }));

    if (newMeta.length > 0) {
      await this.prisma.dialogTagMeta.createMany({ data: newMeta, skipDuplicates: true });
    }
  }

  private async ensureDefaultTagRecords(tenantId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { tenant_id: tenantId },
      select: { name: true },
    });
    const existing = new Set(tags.map((tag) => tag.name.toLowerCase()));

    for (const name of DEFAULT_TAGS) {
      if (existing.has(name.toLowerCase())) {
        continue;
      }
      await this.prisma.tag.create({
        data: {
          tenant_id: tenantId,
          name,
          color: DEFAULT_BACKGROUND,
        },
      });
    }
  }

  private isMissingMetaError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2021' || error.code === 'P2022')
    );
  }

  private async hasMetaTable() {
    try {
      await this.prisma.dialogTagMeta.findFirst({ select: { id: true } });
      return true;
    } catch (error) {
      if (this.isMissingMetaError(error)) {
        return false;
      }
      throw error;
    }
  }

  private async getUsageCounts(tenantId: string, tagId: string) {
    const contacts = await this.prisma.contactTag.count({
      where: { tenant_id: tenantId, tag_id: tagId },
    });

    const conversationRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT c.id)::int AS count
        FROM contacts c
        JOIN contact_tags ct ON ct.contact_id = c.id
        JOIN "Conversation" conv ON conv.contact_id = c.id
        WHERE ct.tenant_id = ${tenantId}
          AND ct.tag_id = ${tagId}`,
    );
    const conversations = conversationRows[0]?.count ?? 0;

    const campaignRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(DISTINCT ctg.campaign_id)::int AS count
        FROM campaign_targets ctg
        JOIN contact_tags ct ON ct.contact_id = ctg.contact_id
        WHERE ct.tenant_id = ${tenantId}
          AND ct.tag_id = ${tagId}`,
    );
    const campaigns = campaignRows[0]?.count ?? 0;

    const automationRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS count
        FROM automation_actions
        WHERE payload::text ILIKE ${`%${tagId}%`}`,
    );
    const automations = automationRows[0]?.count ?? 0;

    const dialogRows = await this.prisma.$queryRaw<{ count: number }[]>(
      Prisma.sql`SELECT COUNT(*)::int AS count
        FROM "Dialog"
        WHERE tenant_id = ${tenantId}
          AND automation_actions::text ILIKE ${`%${tagId}%`}`,
    );
    const dialogs = dialogRows[0]?.count ?? 0;

    return {
      contacts,
      conversations,
      campaigns,
      automations,
      dialogs,
    };
  }
}
