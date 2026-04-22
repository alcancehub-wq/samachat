import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { WhatsappSession } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SessionManager } from './session.manager';
import { ConnectionPoolManager } from './connection-pool.manager';
import { ConnectionStatus, type ConnectionSession } from './types';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionManager: SessionManager,
    private readonly poolManager: ConnectionPoolManager,
  ) {}

  async createConnection(tenantId: string, phoneNumber?: string | null) {
    const sessionId = randomUUID();
    let assignedWorker: string;
    try {
      assignedWorker = await this.poolManager.assignSession(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No workers available';
      throw new ServiceUnavailableException(message);
    }
    const record = await this.prisma.whatsappSession.create({
      data: {
        session_id: sessionId,
        phone_number: phoneNumber ?? null,
        tenant_id: tenantId,
        status: ConnectionStatus.WAITING_QR,
      },
    });

    if (assignedWorker === this.poolManager.getWorkerId()) {
      await this.sessionManager.startSession(record);
    }

    return this.mapSession(record);
  }

  async listConnections(tenantId: string) {
    const records = await this.prisma.whatsappSession.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
    return records.map((record) => this.mapSession(record));
  }

  async getQrCode(id: string, tenantId: string) {
    const record = await this.prisma.whatsappSession.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!record) {
      throw new NotFoundException('Connection not found');
    }

    return {
      id: record.id,
      sessionId: record.session_id,
      status: record.status,
      qrCode: record.qr_code,
    };
  }

  async disconnect(id: string, tenantId: string) {
    const record = await this.prisma.whatsappSession.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!record) {
      throw new NotFoundException('Connection not found');
    }

    await this.sessionManager.stopSession(record.session_id, true);
    await this.poolManager.unassignSession(record.session_id);

    const updated = await this.prisma.whatsappSession.update({
      where: { id: record.id },
      data: {
        status: ConnectionStatus.DISCONNECTED,
        qr_code: null,
      },
    });

    return this.mapSession(updated);
  }

  async remove(id: string, tenantId: string) {
    const record = await this.prisma.whatsappSession.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!record) {
      throw new NotFoundException('Connection not found');
    }

    if (record.status !== ConnectionStatus.DISCONNECTED) {
      await this.sessionManager.stopSession(record.session_id, true);
      await this.poolManager.unassignSession(record.session_id);
    }

    await this.prisma.whatsappSession.delete({ where: { id: record.id } });
    return { id: record.id };
  }

  private mapSession(session: WhatsappSession): ConnectionSession {
    return {
      id: session.id,
      sessionId: session.session_id,
      phoneNumber: session.phone_number,
      status: session.status as ConnectionStatus,
      qrCode: session.qr_code,
      lastConnectedAt: session.last_connected_at,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }
}
