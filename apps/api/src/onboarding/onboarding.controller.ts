import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('onboarding')
export class OnboardingController {
  @Get('steps')
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

  @UseGuards(SupabaseAuthGuard)
  @Post('complete')
  completeOnboarding() {
    return {
      status: 'ok',
      completed_at: new Date().toISOString(),
    };
  }
}
