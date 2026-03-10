import {
  Controller,
  Body,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { getConfig } from '@samachat/config';
import { createRequestLoggerContext, getLogger } from '@samachat/logger';
import { normalizeWebhookEvent, verifyWebhookSignature } from '@samachat/messaging';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { assertFreshWebhookTimestamp, getWebhookTimestampHeader } from '../webhooks/webhook.security';
import { wabaWebhookSchema } from '../webhooks/webhooks.validator';

const logger = getLogger({ provider: 'waba', service: 'api' });

interface RawBodyRequest {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
}

@Controller('waba')
export class WabaController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('webhook')
  verifyWebhook(@Query() query: Record<string, string>) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const { waba } = getConfig();

    if (mode === 'subscribe' && token && token === waba.verifyToken) {
      logger.info({ mode }, 'WABA webhook verified');
      return challenge;
    }

    throw new UnauthorizedException('Invalid verify token');
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest,
    @Body(new ZodValidationPipe(wabaWebhookSchema)) payload: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const config = getConfig();
    const rawBodyText = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(payload ?? {});
    const requestId = Array.isArray(headers['x-request-id'])
      ? headers['x-request-id'][0]
      : headers['x-request-id'];
    const correlationId = Array.isArray(headers['x-correlation-id'])
      ? headers['x-correlation-id'][0]
      : headers['x-correlation-id'];
    const eventIdHeader = Array.isArray(headers['x-event-id'])
      ? headers['x-event-id'][0]
      : headers['x-event-id'];
    const timestampHeader = getWebhookTimestampHeader(headers);
    const timestampMs = assertFreshWebhookTimestamp(timestampHeader);

    const verification = verifyWebhookSignature({
      provider: 'waba',
      rawBody: rawBodyText,
      signature,
      secret: config.waba.appSecret,
    });

    if (!verification.valid) {
      logger.warn(
        createRequestLoggerContext({
          requestId,
          correlationId,
          provider: 'waba',
          eventId: eventIdHeader,
        }),
        `WABA webhook signature rejected (${verification.status})`,
      );
      throw new UnauthorizedException('Invalid signature');
    }

    await this.webhooksService.ensureWebhookFreshness({
      provider: 'waba',
      rawBody: rawBodyText,
      timestampMs,
      signature,
      requestId: requestId || '',
      correlationId: correlationId || requestId || '',
    });

    const receivedAt = new Date().toISOString();
    const normalization = normalizeWebhookEvent('waba', payload ?? {}, {
      receivedAt,
      requestId,
      correlationId,
      eventIdOverride: eventIdHeader,
      tenantId: Array.isArray(headers['x-tenant-id'])
        ? headers['x-tenant-id'][0]
        : headers['x-tenant-id'],
    });

    if (!normalization.ok || !normalization.event) {
      throw new UnauthorizedException('Invalid webhook payload');
    }

    const event = normalization.event;
    const effectiveRequestId = requestId || event.requestId || event.eventId;
    const effectiveCorrelationId = correlationId || event.correlationId || effectiveRequestId;

    await this.webhooksService.enqueueInboundEvent(
      event,
      effectiveRequestId,
      effectiveCorrelationId,
    );

    logger.info(
      createRequestLoggerContext({
        requestId: effectiveRequestId,
        correlationId: effectiveCorrelationId,
        provider: 'waba',
        eventId: event.eventId,
        tenantId: event.tenantId,
      }),
      'WABA webhook received',
    );

    return { received: true, eventId: event.eventId };
  }
}