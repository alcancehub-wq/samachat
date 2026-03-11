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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
const common_1 = require("@nestjs/common");
const baileys_1 = require("@whiskeysockets/baileys");
const config_1 = require("@samachat/config");
const logger_1 = require("@samachat/logger");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const connection_gateway_1 = require("./connection.gateway");
const session_store_1 = require("./session.store");
const types_1 = require("./types");
const messages_service_1 = require("../messages/messages.service");
const client_1 = require("@prisma/client");
let SessionManager = class SessionManager {
    prisma;
    sessionStore;
    gateway;
    messagesService;
    logger = (0, logger_1.getLogger)({ service: 'api', component: 'connections' });
    workerId = process.env.CONNECTION_WORKER_ID || process.env.WORKER_ID || 'default';
    sessions = new Map();
    reconnectTimers = new Map();
    reconnectAttempts = new Map();
    cachedVersion;
    constructor(prisma, sessionStore, gateway, messagesService) {
        this.prisma = prisma;
        this.sessionStore = sessionStore;
        this.gateway = gateway;
        this.messagesService = messagesService;
    }
    async onModuleInit() {
        if (process.env.CONNECTION_POOL_DISABLED === 'true') {
            await this.restoreSessions();
        }
    }
    async onModuleDestroy() {
        await this.stopAll();
    }
    hasSession(sessionId) {
        return this.sessions.has(sessionId);
    }
    async restoreSessions() {
        const sessions = await this.prisma.whatsappSession.findMany({
            where: {
                status: {
                    in: [
                        types_1.ConnectionStatus.CONNECTED,
                        types_1.ConnectionStatus.RECONNECTING,
                        types_1.ConnectionStatus.WAITING_QR,
                    ],
                },
            },
        });
        for (const session of sessions) {
            try {
                await this.startSession(session);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ sessionId: session.session_id, error: message }, 'Failed to restore session');
            }
        }
    }
    async startSession(session) {
        if (this.sessions.has(session.session_id)) {
            return;
        }
        const { state, saveCreds } = await this.sessionStore.buildAuthState(session.session_id, this.logger);
        const version = await this.getBaileysVersion();
        const socket = (0, baileys_1.makeWASocket)({
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
        socket.ev.on('connection.update', (update) => {
            void this.handleConnectionUpdate(session.session_id, update);
        });
        socket.ev.on('messages.upsert', (event) => {
            void this.handleMessagesUpsert(session.session_id, event);
        });
        socket.ev.on('messages.update', (updates) => {
            void this.handleMessagesUpdate(updates);
        });
    }
    async stopSession(sessionId, purgeAuthState = false) {
        const existing = this.sessions.get(sessionId);
        if (existing) {
            try {
                await existing.socket.logout();
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.warn({ sessionId, error: message }, 'Failed to logout session');
            }
            existing.socket.end(undefined);
            this.sessions.delete(sessionId);
        }
        this.clearReconnect(sessionId);
        await this.updateSessionStatus(sessionId, types_1.ConnectionStatus.DISCONNECTED, {
            qr_code: null,
        });
        if (purgeAuthState) {
            await this.sessionStore.deleteAuthState(sessionId);
            await this.sessionStore.deleteSession(sessionId);
        }
    }
    async reconnectSession(sessionId) {
        const record = await this.prisma.whatsappSession.findUnique({
            where: { session_id: sessionId },
        });
        if (!record) {
            return;
        }
        await this.startSession(record);
    }
    async stopAll() {
        const sessions = Array.from(this.sessions.keys());
        await Promise.all(sessions.map((sessionId) => this.stopSession(sessionId)));
    }
    async handleConnectionUpdate(sessionId, update) {
        if (update.qr) {
            await this.updateSessionStatus(sessionId, types_1.ConnectionStatus.WAITING_QR, {
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
            await this.updateSessionStatus(sessionId, types_1.ConnectionStatus.CONNECTED, {
                phone_number: phoneNumber,
                last_connected_at: new Date(),
                qr_code: null,
            });
            await this.sessionStore.publishBusEvent('connection_status', {
                session_id: sessionId,
                tenant_id: this.sessions.get(sessionId)?.tenantId,
                worker_id: this.workerId,
                status: types_1.ConnectionStatus.CONNECTED,
                timestamp: new Date().toISOString(),
            });
            this.gateway.emitStatus({ sessionId, status: types_1.ConnectionStatus.CONNECTED });
            this.logger.info({ sessionId }, 'Connection opened');
        }
        if (update.connection === 'close') {
            await this.updateSessionStatus(sessionId, types_1.ConnectionStatus.DISCONNECTED);
            await this.sessionStore.publishBusEvent('connection_status', {
                session_id: sessionId,
                tenant_id: this.sessions.get(sessionId)?.tenantId,
                worker_id: this.workerId,
                status: types_1.ConnectionStatus.DISCONNECTED,
                timestamp: new Date().toISOString(),
            });
            this.gateway.emitStatus({ sessionId, status: types_1.ConnectionStatus.DISCONNECTED });
            await this.teardownSession(sessionId);
            this.logger.warn({ sessionId }, 'Connection closed');
            const statusCode = update.lastDisconnect?.error?.output
                ?.statusCode;
            if (statusCode !== baileys_1.DisconnectReason.loggedOut) {
                await this.scheduleReconnect(sessionId);
            }
        }
    }
    async scheduleReconnect(sessionId) {
        const config = (0, config_1.getConfig)();
        const maxAttempts = config.retry.maxAttempts;
        const baseDelay = config.retry.delayMs;
        const attempts = (this.reconnectAttempts.get(sessionId) ?? 0) + 1;
        this.reconnectAttempts.set(sessionId, attempts);
        if (attempts > maxAttempts) {
            this.logger.warn({ sessionId, attempts }, 'Reconnect attempts exhausted');
            return;
        }
        const delay = Math.min(baseDelay * 2 ** (attempts - 1), 60000);
        await this.updateSessionStatus(sessionId, types_1.ConnectionStatus.RECONNECTING);
        await this.sessionStore.publishBusEvent('connection_status', {
            session_id: sessionId,
            tenant_id: this.sessions.get(sessionId)?.tenantId,
            worker_id: this.workerId,
            status: types_1.ConnectionStatus.RECONNECTING,
            timestamp: new Date().toISOString(),
        });
        await this.sessionStore.publishBusEvent('connection_reconnect', {
            session_id: sessionId,
            tenant_id: this.sessions.get(sessionId)?.tenantId,
            worker_id: this.workerId,
            attempts,
            timestamp: new Date().toISOString(),
        });
        this.gateway.emitStatus({ sessionId, status: types_1.ConnectionStatus.RECONNECTING });
        this.logger.warn({ sessionId, attempts }, 'Connection reconnecting');
        const timer = setTimeout(() => {
            void this.reconnectSession(sessionId);
        }, delay);
        this.reconnectTimers.set(sessionId, timer);
    }
    clearReconnect(sessionId) {
        const timer = this.reconnectTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(sessionId);
        }
        this.reconnectAttempts.delete(sessionId);
    }
    async teardownSession(sessionId) {
        const existing = this.sessions.get(sessionId);
        if (existing) {
            existing.socket.end(undefined);
            this.sessions.delete(sessionId);
        }
    }
    resolvePhoneNumber(sessionId) {
        const socket = this.sessions.get(sessionId)?.socket;
        const rawId = socket?.user?.id;
        if (!rawId) {
            return null;
        }
        const [numberPart] = rawId.split('@');
        return numberPart ?? null;
    }
    async updateSessionStatus(sessionId, status, data = {}) {
        const record = await this.prisma.whatsappSession.update({
            where: { session_id: sessionId },
            data: {
                status,
                ...data,
            },
        });
        await this.sessionStore.saveSession(this.mapSession(record));
    }
    mapSession(session) {
        return {
            id: session.id,
            sessionId: session.session_id,
            phoneNumber: session.phone_number,
            status: session.status,
            qrCode: session.qr_code,
            lastConnectedAt: session.last_connected_at,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
        };
    }
    async getBaileysVersion() {
        if (this.cachedVersion) {
            return this.cachedVersion;
        }
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        this.cachedVersion = version;
        return version;
    }
    getClientByTenant(tenantId) {
        for (const session of this.sessions.values()) {
            if (session.tenantId === tenantId) {
                return session.socket;
            }
        }
        return null;
    }
    async handleMessagesUpsert(sessionId, event) {
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
    async handleMessagesUpdate(updates) {
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
    mapMessageStatus(status) {
        switch (status) {
            case baileys_1.WAMessageStatus.SERVER_ACK:
                return client_1.MessageStatus.SENT;
            case baileys_1.WAMessageStatus.DELIVERY_ACK:
            case baileys_1.WAMessageStatus.READ:
                return client_1.MessageStatus.DELIVERED;
            case baileys_1.WAMessageStatus.ERROR:
                return client_1.MessageStatus.FAILED;
            default:
                return null;
        }
    }
};
exports.SessionManager = SessionManager;
exports.SessionManager = SessionManager = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => messages_service_1.MessagesService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        session_store_1.SessionStore,
        connection_gateway_1.ConnectionGateway,
        messages_service_1.MessagesService])
], SessionManager);
