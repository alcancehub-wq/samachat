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
exports.ConnectionsController = void 0;
const common_1 = require("@nestjs/common");
const supabase_auth_guard_1 = require("../../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const permissions_guard_1 = require("../../common/guards/permissions.guard");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const connections_service_1 = require("./connections.service");
let ConnectionsController = class ConnectionsController {
    connectionsService;
    constructor(connectionsService) {
        this.connectionsService = connectionsService;
    }
    createConnection(req, payload) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.connectionsService.createConnection(req.tenantId, payload?.phoneNumber ?? null);
    }
    listConnections(req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.connectionsService.listConnections(req.tenantId);
    }
    getQrCode(id, req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.connectionsService.getQrCode(id, req.tenantId);
    }
    disconnect(id, req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.connectionsService.disconnect(id, req.tenantId);
    }
    remove(id, req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.connectionsService.remove(id, req.tenantId);
    }
};
exports.ConnectionsController = ConnectionsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('connections:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ConnectionsController.prototype, "createConnection", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('connections:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectionsController.prototype, "listConnections", null);
__decorate([
    (0, common_1.Get)(':id/qr'),
    (0, permissions_decorator_1.Permissions)('connections:qr'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectionsController.prototype, "getQrCode", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('connections:disconnect'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectionsController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Delete)(':id/remove'),
    (0, permissions_decorator_1.Permissions)('connections:disconnect'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectionsController.prototype, "remove", null);
exports.ConnectionsController = ConnectionsController = __decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('connections'),
    __metadata("design:paramtypes", [connections_service_1.ConnectionsService])
], ConnectionsController);
