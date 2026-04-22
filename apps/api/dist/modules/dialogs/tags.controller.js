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
exports.DialogTagsController = void 0;
const common_1 = require("@nestjs/common");
const supabase_auth_guard_1 = require("../../common/guards/supabase-auth.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const permissions_guard_1 = require("../../common/guards/permissions.guard");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const tags_service_1 = require("./tags.service");
let DialogTagsController = class DialogTagsController {
    tagsService;
    constructor(tagsService) {
        this.tagsService = tagsService;
    }
    async list(req) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.tagsService.listTags(req.tenantId);
    }
    async create(req, body) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.tagsService.createTag(req.tenantId, body);
    }
    async update(req, id, body) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.tagsService.updateTag(req.tenantId, id, body);
    }
    async remove(req, id, force) {
        if (!req.tenantId) {
            throw new common_1.BadRequestException('Missing tenant context');
        }
        return this.tagsService.deleteTag(req.tenantId, id, force === 'true');
    }
};
exports.DialogTagsController = DialogTagsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('tags:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DialogTagsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('tags:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DialogTagsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('tags:create'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DialogTagsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('tags:delete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('force')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DialogTagsController.prototype, "remove", null);
exports.DialogTagsController = DialogTagsController = __decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard, tenant_guard_1.TenantGuard, permissions_guard_1.PermissionsGuard),
    (0, common_1.Controller)('dialogs/tags'),
    __metadata("design:paramtypes", [tags_service_1.DialogTagsService])
], DialogTagsController);
