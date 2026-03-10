import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { MessagingProviderName } from '@samachat/messaging';
import { normalizeWebhookEvent, verifyWebhookSignature } from '@samachat/messaging';
import { getConfig } from '@samachat/config';
import { createRequestLoggerContext, getLogger } from '@samachat/logger';
import { WebhooksService } from './webhooks.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assertFreshWebhookTimestamp, getWebhookTimestampHeader } from './webhook.security';
import { validateWebhookPayload, webhookBaseSchema } from './webhooks.validator';

const logger = getLogger({ service: 'api', component: 'webhooks' });
const validProviders: MessagingProviderName[] = ['qr', 'waba'];

function isProviderName(value: string): value is MessagingProviderName {
  return validProviders.includes(value as MessagingProviderName);
}

interface RawBodyRequest {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Body(new ZodValidationPipe(webhookBaseSchema)) payload: unknown,
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Headers('x-request-id') requestIdHeader?: string,
    @Headers('x-correlation-id') correlationIdHeader?: string,
    @Headers('x-event-id') eventIdHeader?: string,
    @Headers('content-type') contentTypeHeader?: string,
    @Headers('x-hub-signature-256') wabaSignature?: string,
    @Headers('x-webhook-signature') webhookSignature?: string,
    @Headers('x-qr-signature') qrSignature?: string,
  ) {
    if (!isProviderName(provider)) {
      throw new BadRequestException('Invalid provider');
    }

    const config = getConfig();
    const contentType = ((contentTypeHeader || '').split(';')[0] || '').trim();
    if (!contentType || !config.webhook.allowedContentTypes.includes(contentType)) {
      throw new BadRequestException('Unsupported content-type');
    }

    if (payload === null || payload === undefined) {
      throw new BadRequestException('Missing payload');
    }

    const timestampHeader = getWebhookTimestampHeader(headers);
    const timestampMs = assertFreshWebhookTimestamp(timestampHeader);

    const rawBodyText = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload);
    const payloadSize = req.rawBody?.length ?? Buffer.byteLength(rawBodyText);
    if (payloadSize > config.webhook.maxPayloadBytes) {
      throw new BadRequestException('Payload too large');
    }

    const requestId = requestIdHeader || randomUUID();
    const correlationId = correlationIdHeader || requestId;
    const signature = provider === 'waba' ? wabaSignature : webhookSignature || qrSignature;
    const secret = provider === 'waba' ? config.waba.appSecret : config.webhook.qrSecret;
    const verification = verifyWebhookSignature({
      provider,
      rawBody: rawBodyText,
      signature,
      secret,
    });

    if (!verification.valid) {
      logger.warn(
        createRequestLoggerContext({
          requestId,
          correlationId,
          provider,
          eventId: eventIdHeader,
        }),
        `Webhook signature rejected (${verification.status})`,
      );
      throw new UnauthorizedException('Invalid signature');
    }

    await this.webhooksService.ensureWebhookFreshness({
      provider,
      rawBody: rawBodyText,
      timestampMs,
      signature,
      requestId,
      correlationId,
    });

    const payloadValidation = validateWebhookPayload(provider, payload);
    if (!payloadValidation.ok) {
      throw new BadRequestException(payloadValidation.error || 'Invalid payload');
    }

    const receivedAt = new Date().toISOString();

    const normalization = normalizeWebhookEvent(provider, payload, {
      receivedAt,
      requestId,
      correlationId,
      eventIdOverride: eventIdHeader,
      tenantId: Array.isArray(req.headers['x-tenant-id'])
        ? req.headers['x-tenant-id'][0]
        : req.headers['x-tenant-id'],
    });

    if (!normalization.ok || !normalization.event) {
      throw new BadRequestException(normalization.error || 'Invalid payload');
    }

    const event = normalization.event;
    const effectiveRequestId = requestId || event.requestId || event.eventId;
    const effectiveCorrelationId = correlationId || event.correlationId || effectiveRequestId;

    logger.info(
      createRequestLoggerContext({
        provider,
        eventId: event.eventId,
        requestId: effectiveRequestId,
        correlationId: effectiveCorrelationId,
        tenantId: event.tenantId,
      }),
      'Webhook received',
    );

    const result = await this.webhooksService.enqueueInboundEvent(
      event,
      effectiveRequestId,
      effectiveCorrelationId,
    );

    return {
      status: result.status,
      eventId: result.eventId,
      requestId,
      correlationId: effectiveCorrelationId,
      signatureStatus: verification.status,
    };
  }
}
