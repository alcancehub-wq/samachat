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
exports.ConnectionsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const session_manager_1 = require("./session.manager");
const connection_pool_manager_1 = require("./connection-pool.manager");
const types_1 = require("./types");
let ConnectionsService = class ConnectionsService {
    prisma;
    sessionManager;
    poolManager;
    constructor(prisma, sessionManager, poolManager) {
        this.prisma = prisma;
        this.sessionManager = sessionManager;
        this.poolManager = poolManager;
    }
    async createConnection(tenantId, phoneNumber) {
        const sessionId = (0, crypto_1.randomUUID)();
        let assignedWorker;
        try {
            assignedWorker = await this.poolManager.assignSession(sessionId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'No workers available';
            throw new common_1.ServiceUnavailableException(message);
        }
        const record = await this.prisma.whatsappSession.create({
            data: {
                session_id: sessionId,
                phone_number: phoneNumber ?? null,
                tenant_id: tenantId,
                status: types_1.ConnectionStatus.WAITING_QR,
            },
        });
        if (assignedWorker === this.poolManager.getWorkerId()) {
            await this.sessionManager.startSession(record);
        }
        return this.mapSession(record);
    }
    async listConnections(tenantId) {
        const records = await this.prisma.whatsappSession.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'desc' },
        });
        return records.map((record) => this.mapSession(record));
    }
    async getQrCode(id, tenantId) {
        const record = await this.prisma.whatsappSession.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Connection not found');
        }
        return {
            id: record.id,
            sessionId: record.session_id,
            status: record.status,
            qrCode: record.qr_code,
        };
    }
    async disconnect(id, tenantId) {
        const record = await this.prisma.whatsappSession.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Connection not found');
        }
        await this.sessionManager.stopSession(record.session_id, true);
        await this.poolManager.unassignSession(record.session_id);
        const updated = await this.prisma.whatsappSession.update({
            where: { id: record.id },
            data: {
                status: types_1.ConnectionStatus.DISCONNECTED,
                qr_code: null,
            },
        });
        return this.mapSession(updated);
    }
    async remove(id, tenantId) {
        const record = await this.prisma.whatsappSession.findFirst({
            where: { id, tenant_id: tenantId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Connection not found');
        }
        if (record.status !== types_1.ConnectionStatus.DISCONNECTED) {
            await this.sessionManager.stopSession(record.session_id, true);
            await this.poolManager.unassignSession(record.session_id);
        }
        await this.prisma.whatsappSession.delete({ where: { id: record.id } });
        return { id: record.id };
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
};
exports.ConnectionsService = ConnectionsService;
exports.ConnectionsService = ConnectionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        session_manager_1.SessionManager,
        connection_pool_manager_1.ConnectionPoolManager])
], ConnectionsService);
