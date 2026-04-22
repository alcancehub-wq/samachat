"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const health_module_1 = require("./health/health.module");
const metrics_module_1 = require("./metrics/metrics.module");
const version_module_1 = require("./version/version.module");
const auth_module_1 = require("./auth/auth.module");
const tenants_module_1 = require("./tenants/tenants.module");
const users_module_1 = require("./users/users.module");
const conversations_module_1 = require("./conversations/conversations.module");
const flows_module_1 = require("./flows/flows.module");
const campaigns_module_1 = require("./modules/campaigns/campaigns.module");
const integrations_module_1 = require("./integrations/integrations.module");
const waba_module_1 = require("./waba/waba.module");
const legal_module_1 = require("./legal/legal.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const common_module_1 = require("./common/common.module");
const invites_module_1 = require("./invites/invites.module");
const me_module_1 = require("./me/me.module");
const connections_module_1 = require("./modules/connections/connections.module");
const crm_module_1 = require("./modules/crm/crm.module");
const automation_module_1 = require("./modules/automation/automation.module");
const workspaces_module_1 = require("./workspaces/workspaces.module");
const dialogs_module_1 = require("./modules/dialogs/dialogs.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [
                    {
                        ttl: 60,
                        limit: 100,
                    },
                ],
            }),
            common_module_1.CommonModule,
            health_module_1.HealthModule,
            metrics_module_1.MetricsModule,
            version_module_1.VersionModule,
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            users_module_1.UsersModule,
            conversations_module_1.ConversationsModule,
            flows_module_1.FlowsModule,
            campaigns_module_1.CampaignsModule,
            integrations_module_1.IntegrationsModule,
            waba_module_1.WabaModule,
            legal_module_1.LegalModule,
            onboarding_module_1.OnboardingModule,
            webhooks_module_1.WebhooksModule,
            invites_module_1.InvitesModule,
            me_module_1.MeModule,
            connections_module_1.ConnectionsModule,
            crm_module_1.CrmModule,
            automation_module_1.AutomationModule,
            workspaces_module_1.WorkspacesModule,
            dialogs_module_1.DialogsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
