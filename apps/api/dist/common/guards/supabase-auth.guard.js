"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@samachat/config");
let SupabaseAuthGuard = class SupabaseAuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const header = request.headers['authorization'];
        if (!header || typeof header !== 'string') {
            throw new common_1.UnauthorizedException('Missing authorization header');
        }
        const [, token] = header.split(' ');
        if (!token) {
            throw new common_1.UnauthorizedException('Missing bearer token');
        }
        const config = (0, config_1.getConfig)();
        const supabaseUrl = config.supabase.url;
        const supabaseApiKey = config.supabase.serviceRoleKey;
        if (!supabaseUrl || !supabaseApiKey) {
            throw new common_1.UnauthorizedException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }
        let payload;
        try {
            const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    apikey: supabaseApiKey,
                },
            });
            if (!response.ok) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            payload = (await response.json());
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const roleFromMetadata = payload.app_metadata?.role ||
            payload.user_metadata?.role ||
            payload.role;
        const tenantId = payload.app_metadata?.tenant_id ||
            payload.user_metadata?.tenant_id;
        const name = payload.user_metadata?.full_name ||
            payload.user_metadata?.name;
        if (!payload.id || !payload.email) {
            throw new common_1.UnauthorizedException('Missing user context');
        }
        const role = roleFromMetadata || 'agent';
        const user = {
            id: payload.id,
            email: payload.email,
            role,
            tenant_id: tenantId,
            name,
        };
        request.user = user;
        return true;
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
exports.SupabaseAuthGuard = SupabaseAuthGuard = __decorate([
    (0, common_1.Injectable)()
], SupabaseAuthGuard);
