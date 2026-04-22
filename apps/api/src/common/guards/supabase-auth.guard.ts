import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@samachat/shared';
import { getConfig } from '@samachat/config';
import { RequestUser } from '../interfaces/request-user';

interface SupabaseUser {
  id?: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  role?: string;
}

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const SUPABASE_FETCH_TIMEOUT_MS = 5000;
const tokenCache = new Map<string, { user: RequestUser; expiresAt: number }>();

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'];
    if (!header || typeof header !== 'string') {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [, token] = header.split(' ');
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      request.user = cached.user;
      return true;
    }

    const config = getConfig();
    const supabaseUrl = config.supabase.url;
    const supabaseApiKey = config.supabase.serviceRoleKey;

    if (!supabaseUrl || !supabaseApiKey) {
      throw new UnauthorizedException('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    let payload: SupabaseUser;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS);
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseApiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new UnauthorizedException('Invalid token');
      }

      payload = (await response.json()) as SupabaseUser;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const roleFromMetadata =
      (payload.app_metadata?.role as string | undefined) ||
      (payload.user_metadata?.role as string | undefined) ||
      payload.role;

    const tenantId =
      (payload.app_metadata?.tenant_id as string | undefined) ||
      (payload.user_metadata?.tenant_id as string | undefined);

    const name =
      (payload.user_metadata?.full_name as string | undefined) ||
      (payload.user_metadata?.name as string | undefined);

    if (!payload.id || !payload.email) {
      throw new UnauthorizedException('Missing user context');
    }

    const role: Role = (roleFromMetadata as Role) || 'agent';

    const user: RequestUser = {
      id: payload.id,
      email: payload.email,
      role,
      tenant_id: tenantId,
      name,
    };

    request.user = user;
    tokenCache.set(token, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    return true;
  }
}
