import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { TenantGuard } from './guards/tenant.guard';
import { RbacGuard } from './guards/rbac.guard';

@Global()
@Module({
  providers: [PrismaService, TenantGuard, RbacGuard],
  exports: [PrismaService, TenantGuard, RbacGuard],
})
export class CommonModule {}
