import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { VersionModule } from './version/version.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FlowsModule } from './flows/flows.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WabaModule } from './waba/waba.module';
import { LegalModule } from './legal/legal.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CommonModule } from './common/common.module';
import { InvitesModule } from './invites/invites.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
    }),
    CommonModule,
    HealthModule,
    MetricsModule,
    VersionModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ConversationsModule,
    FlowsModule,
    CampaignsModule,
    IntegrationsModule,
    WabaModule,
    LegalModule,
    OnboardingModule,
    WebhooksModule,
    InvitesModule,
    MeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
