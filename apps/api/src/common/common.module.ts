import { Global, Module } from '@nestjs/common';
import IORedis from 'ioredis';
import { requireRedisUrl } from '@samachat/config';
import { PrismaService } from './prisma/prisma.service';
import { TenantGuard } from './guards/tenant.guard';
import { RbacGuard } from './guards/rbac.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { CONNECTIONS_REDIS } from '../modules/connections/session.store';

@Global()
@Module({
  providers: [
    PrismaService,
    TenantGuard,
    RbacGuard,
    PermissionsGuard,
    {
      provide: CONNECTIONS_REDIS,
      useFactory: () => {
        const redisUrl = requireRedisUrl();
        return new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
      },
    },
  ],
  exports: [PrismaService, TenantGuard, RbacGuard, PermissionsGuard, CONNECTIONS_REDIS],
})
export class CommonModule {}
