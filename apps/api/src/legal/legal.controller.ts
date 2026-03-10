import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  consentCreateSchema,
  dataRequestSchema,
  preferenceSchema,
  legalAcceptanceSchema,
  ConsentCreateInput,
  DataRequestInput,
  PreferenceInput,
  LegalAcceptanceInput,
} from '@samachat/shared';
import { getConfig } from '@samachat/config';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { RequestUser } from '../common/interfaces/request-user';
import { PrismaService } from '../common/prisma/prisma.service';
import { ensureUserProfile } from '../common/tenant/tenant.utils';

@Controller('legal')
export class LegalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('documents')
  listDocuments() {
    const config = getConfig();
    return {
      items: [
        { id: 'terms_current', type: 'terms', version: config.legal.termsVersion, active: true },
        { id: 'privacy_current', type: 'privacy', version: config.legal.privacyVersion, active: true },
      ],
    };
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Post('acceptance')
  async acceptLegal(
    @Body(new ZodValidationPipe(legalAcceptanceSchema)) body: LegalAcceptanceInput,
    @Req()
    req: { user: RequestUser; tenantId?: string; userProfile?: { id: string } },
  ) {
    const config = getConfig();
    const profile = req.userProfile ?? (await ensureUserProfile(this.prisma, req.user));
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Missing tenant context');
    }

    if (
      body.terms_version !== config.legal.termsVersion ||
      body.privacy_version !== config.legal.privacyVersion
    ) {
      throw new BadRequestException('Legal version mismatch');
    }

    const acceptance = await this.prisma.legalAcceptance.create({
      data: {
        tenant_id: tenantId,
        user_id: profile.id,
        terms_version: config.legal.termsVersion,
        privacy_version: config.legal.privacyVersion,
        accepted_at: body.accepted_at ? new Date(body.accepted_at) : new Date(),
        ip_address: body.ip_address ?? null,
        user_agent: body.user_agent ?? null,
      },
    });

    return { status: 'ok', acceptance };
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Post('consents')
  createConsent(
    @Body(new ZodValidationPipe(consentCreateSchema)) body: ConsentCreateInput,
    @Req() req: { user: RequestUser; tenantId?: string },
  ) {
    return {
      id: 'consent_stub',
      user_id: req.user.id,
      tenant_id: req.tenantId,
      ...body,
      accepted_at: body.accepted_at ?? new Date().toISOString(),
    };
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Post('preferences')
  savePreferences(
    @Body(new ZodValidationPipe(preferenceSchema)) body: PreferenceInput,
    @Req() req: { user: RequestUser; tenantId?: string },
  ) {
    return {
      id: 'pref_stub',
      user_id: req.user.id,
      tenant_id: req.tenantId,
      ...body,
    };
  }

  @UseGuards(SupabaseAuthGuard, TenantGuard)
  @Post('data-requests')
  createDataRequest(
    @Body(new ZodValidationPipe(dataRequestSchema)) body: DataRequestInput,
    @Req() req: { user: RequestUser; tenantId?: string },
  ) {
    return {
      id: 'request_stub',
      user_id: req.user.id,
      tenant_id: req.tenantId,
      status: 'requested',
      ...body,
    };
  }
}
