import { Injectable, OnModuleDestroy, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  WAMessageStatus,
  type WAMessageUpdate,
  type ConnectionState,
  type WASocket,
} from '@whiskeysockets/baileys';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import type { WhatsappSession } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectionGateway } from './connection.gateway';
import { SessionStore } from './session.store';
import { ConnectionStatus, type ConnectionSession } from './types';
import { MessagesService } from '../messages/messages.service';
import type { proto } from '@whiskeysockets/baileys';
import { MessageStatus } from '@prisma/client';

interface ManagedSession {
  socket: WASocket;
  tenantId: string;
}

@Injectable()
export class SessionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = getLogger({ service: 'api', component: 'connections' });
  private readonly workerId =
    process.env.CONNECTION_WORKER_ID || process.env.WORKER_ID || 'default';
  private readonly sessions = new Map<string, ManagedSession>();
  private readonly reconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly reconnectAttempts = new Map<string, number>();
  private cachedVersion?: [number, number, number];

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionStore: SessionStore,
    private readonly gateway: ConnectionGateway,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  async onModuleInit() {
    if (process.env.CONNECTION_POOL_DISABLED === 'true') {
      await this.restoreSessions();
    }
  }

  async onModuleDestroy() {
    await this.stopAll();
  }

  hasSession(sessionId: string) {
    return this.sessions.has(sessionId);
  }

  async restoreSessions() {
    const sessions = await this.prisma.whatsappSession.findMany({
      where: {
        status: {
          in: [
            ConnectionStatus.CONNECTED,
            ConnectionStatus.RECONNECTING,
            ConnectionStatus.WAITING_QR,
          ],
        },
      },
    });

    for (const session of sessions) {
      try {
        await this.startSession(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to restore session');
      }
    }
  }

  async startSession(session: WhatsappSession) {
    if (this.sessions.has(session.session_id)) {
      return;
    }

    const { state, saveCreds } = await this.sessionStore.buildAuthState(
      session.session_id,
      this.logger,
    );
    const version = await this.getBaileysVersion();

    const socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: state.keys,
      },
      printQRInTerminal: false,
      logger: this.logger,
      version,
      browser: ['Samachat', 'Chrome', '1.0.0'],
    });

    this.sessions.set(session.session_id, { socket, tenantId: session.tenant_id });

    socket.ev.on('creds.update', () => {
      void saveCreds();
    });

    socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
      void this.handleConnectionUpdate(session.session_id, update);
    });

    socket.ev.on('messages.upsert', (event) => {
      void this.handleMessagesUpsert(session.session_id, event);
    });

    socket.ev.on('messages.update', (updates) => {
      void this.handleMessagesUpdate(updates);
    });
  }

  async stopSession(sessionId: string, purgeAuthState = false) {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      try {
        await existing.socket.logout();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ sessionId, error: message }, 'Failed to logout session');
      }
      existing.socket.end(undefined);
      this.sessions.delete(sessionId);
    }

    this.clearReconnect(sessionId);

    await this.updateSessionStatus(sessionId, ConnectionStatus.DISCONNECTED, {
      qr_code: null,
    });

    if (purgeAuthState) {
      await this.sessionStore.deleteAuthState(sessionId);
      await this.sessionStore.deleteSession(sessionId);
    }
  }

  async reconnectSession(sessionId: string) {
    const record = await this.prisma.whatsappSession.findUnique({
      where: { session_id: sessionId },
    });

    if (!record) {
      return;
    }

    await this.startSession(record);
  }

  private async stopAll() {
    const sessions = Array.from(this.sessions.keys());
    await Promise.all(sessions.map((sessionId) => this.stopSession(sessionId)));
  }

  private async handleConnectionUpdate(
    sessionId: string,
    update: Partial<ConnectionState>,
  ) {
    if (update.qr) {
      await this.updateSessionStatus(sessionId, ConnectionStatus.WAITING_QR, {
        qr_code: update.qr,
      });
      await this.sessionStore.publishEvent('whatsapp_qr_generated', {
        sessionId,
        qrCode: update.qr,
      });
      this.logger.info({ sessionId }, 'QR code generated');
      this.gateway.emitQr({ sessionId, qrCode: update.qr });
    }

    if (update.connection === 'open') {
      this.clearReconnect(sessionId);
      this.reconnectAttempts.delete(sessionId);

      const phoneNumber = this.resolvePhoneNumber(sessionId);
      await this.updateSessionStatus(sessionId, ConnectionStatus.CONNECTED, {
        phone_number: phoneNumber,
        last_connected_at: new Date(),
        qr_code: null,
      });
      await this.sessionStore.publishBusEvent('connection_status', {
        session_id: sessionId,
        tenant_id: this.sessions.get(sessionId)?.tenantId,
        worker_id: this.workerId,
        status: ConnectionStatus.CONNECTED,
        timestamp: new Date().toISOString(),
      });
      this.gateway.emitStatus({ sessionId, status: ConnectionStatus.CONNECTED });
      this.logger.info({ sessionId }, 'Connection opened');
    }

    if (update.connection === 'close') {
      await this.updateSessionStatus(sessionId, ConnectionStatus.DISCONNECTED);
      await this.sessionStore.publishBusEvent('connection_status', {
        session_id: sessionId,
        tenant_id: this.sessions.get(sessionId)?.tenantId,
        worker_id: this.workerId,
        status: ConnectionStatus.DISCONNECTED,
        timestamp: new Date().toISOString(),
      });
      this.gateway.emitStatus({ sessionId, status: ConnectionStatus.DISCONNECTED });
      await this.teardownSession(sessionId);
      this.logger.warn({ sessionId }, 'Connection closed');

      const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        await this.scheduleReconnect(sessionId);
      }
    }
  }

  private async scheduleReconnect(sessionId: string) {
    const config = getConfig();
    const maxAttempts = config.retry.maxAttempts;
    const baseDelay = config.retry.delayMs;

    const attempts = (this.reconnectAttempts.get(sessionId) ?? 0) + 1;
    this.reconnectAttempts.set(sessionId, attempts);

    if (attempts > maxAttempts) {
      this.logger.warn({ sessionId, attempts }, 'Reconnect attempts exhausted');
      return;
    }

    const delay = Math.min(baseDelay * 2 ** (attempts - 1), 60000);
    await this.updateSessionStatus(sessionId, ConnectionStatus.RECONNECTING);
    await this.sessionStore.publishBusEvent('connection_status', {
      session_id: sessionId,
      tenant_id: this.sessions.get(sessionId)?.tenantId,
      worker_id: this.workerId,
      status: ConnectionStatus.RECONNECTING,
      timestamp: new Date().toISOString(),
    });
    await this.sessionStore.publishBusEvent('connection_reconnect', {
      session_id: sessionId,
      tenant_id: this.sessions.get(sessionId)?.tenantId,
      worker_id: this.workerId,
      attempts,
      timestamp: new Date().toISOString(),
    });
    this.gateway.emitStatus({ sessionId, status: ConnectionStatus.RECONNECTING });
    this.logger.warn({ sessionId, attempts }, 'Connection reconnecting');

    const timer = setTimeout(() => {
      void this.reconnectSession(sessionId);
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
  }

  private clearReconnect(sessionId: string) {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }
    this.reconnectAttempts.delete(sessionId);
  }

  private async teardownSession(sessionId: string) {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.socket.end(undefined);
      this.sessions.delete(sessionId);
    }
  }

  private resolvePhoneNumber(sessionId: string) {
    const socket = this.sessions.get(sessionId)?.socket;
    const rawId = socket?.user?.id;
    if (!rawId) {
      return null;
    }
    const [numberPart] = rawId.split('@');
    return numberPart ?? null;
  }

  private async updateSessionStatus(
    sessionId: string,
    status: ConnectionStatus,
    data: Partial<Pick<WhatsappSession, 'phone_number' | 'qr_code' | 'last_connected_at'>> = {},
  ) {
    const record = await this.prisma.whatsappSession.update({
      where: { session_id: sessionId },
      data: {
        status,
        ...data,
      },
    });

    await this.sessionStore.saveSession(this.mapSession(record));
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

  private async getBaileysVersion() {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }
    const { version } = await fetchLatestBaileysVersion();
    this.cachedVersion = version;
    return version;
  }

  getClientByTenant(tenantId: string): WASocket | null {
    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId) {
        return session.socket;
      }
    }
    return null;
  }

  private async handleMessagesUpsert(
    sessionId: string,
    event: { messages: proto.IWebMessageInfo[] },
  ) {
    const messages = event.messages ?? [];
    for (const message of messages) {
      if (message.key?.fromMe) {
        continue;
      }
      this.messagesService.processIncomingMessage(sessionId, message).catch((error) => {
        const messageText = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ sessionId, error: messageText }, 'Failed to process inbound message');
      });
    }
  }

  private async handleMessagesUpdate(
    updates: WAMessageUpdate[] | { key?: proto.IMessageKey; update?: { status?: number } }[],
  ) {
    for (const update of updates) {
      const externalId = update.key?.id;
      const statusCode = update.update?.status;
      if (!externalId || typeof statusCode !== 'number') {
        continue;
      }

      const status = this.mapMessageStatus(statusCode);
      if (!status) {
        continue;
      }

      await this.messagesService.updateMessageStatus(externalId, status);
    }
  }

  private mapMessageStatus(status: number): MessageStatus | null {
    switch (status) {
      case WAMessageStatus.SERVER_ACK:
        return MessageStatus.SENT;
      case WAMessageStatus.DELIVERY_ACK:
      case WAMessageStatus.READ:
        return MessageStatus.DELIVERED;
      case WAMessageStatus.ERROR:
        return MessageStatus.FAILED;
      default:
        return null;
    }
  }
}
