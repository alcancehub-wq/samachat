import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import type { InviteCreateInput, Role } from '@samachat/shared';
import type { RequestUser } from '../common/interfaces/request-user';
import { ensureUserProfile } from '../common/tenant/tenant.utils';

const DEFAULT_INVITE_DAYS = 7;

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(tenantId: string, input: InviteCreateInput, user: RequestUser) {
    const profile = await ensureUserProfile(this.prisma, user);
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + DEFAULT_INVITE_DAYS * 24 * 60 * 60 * 1000);

    return this.prisma.invite.create({
      data: {
        tenant_id: tenantId,
        email: input.email,
        role: input.role as Role,
        token,
        expires_at: expiresAt,
        created_by_user_id: profile.id,
      },
    });
  }

  async listPendingInvites(email: string) {
    return this.prisma.invite.findMany({
      where: {
        email,
        accepted_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async acceptInvite(token: string, user: RequestUser) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error('INVITE_NOT_FOUND');
    }

    if (invite.accepted_at) {
      return { invite, status: 'already-accepted' as const };
    }

    if (invite.expires_at.getTime() < Date.now()) {
      throw new Error('INVITE_EXPIRED');
    }

    const profile = await ensureUserProfile(this.prisma, user);

    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        tenant_id: invite.tenant_id,
        user_id: profile.id,
      },
    });

    if (!existingMembership) {
      await this.prisma.membership.create({
        data: {
          tenant_id: invite.tenant_id,
          user_id: profile.id,
          role: invite.role as Role,
        },
      });
    }

    const updatedInvite = await this.prisma.invite.update({
      where: { token },
      data: { accepted_at: new Date() },
    });

    return { invite: updatedInvite, status: 'accepted' as const };
  }
}
