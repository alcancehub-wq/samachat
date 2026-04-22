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
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const supabase_auth_guard_1 = require("../common/guards/supabase-auth.guard");
let OnboardingController = class OnboardingController {
    listSteps() {
        return {
            steps: [
                'Selecionar workspace',
                'Aceitar Termos e Privacidade',
                'Preferencias iniciais',
                'Conectar WABA',
                'Criar primeiro agente',
            ],
        };
    }
    completeOnboarding() {
        return {
            status: 'ok',
            completed_at: new Date().toISOString(),
        };
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Get)('steps'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "listSteps", null);
__decorate([
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    (0, common_1.Post)('complete'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "completeOnboarding", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('onboarding')
], OnboardingController);
