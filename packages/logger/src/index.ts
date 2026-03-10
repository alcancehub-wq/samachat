import pino from 'pino';
import { context, trace } from '@opentelemetry/api';
import { getConfig } from '@samachat/config';

const config = getConfig();
const baseLogger = pino({
  level: config.logging.level,
  base: { service: process.env.SAMACHAT_SERVICE || 'unknown' },
  timestamp: () => `,\"timestamp\":\"${new Date().toISOString()}\"`,
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) {
      return {};
    }
    return { traceId: span.spanContext().traceId };
  },
});

export type Logger = pino.Logger;

export interface RequestLoggerContext {
  requestId?: string;
  correlationId?: string;
  provider?: string;
  eventId?: string;
  tenantId?: string;
  component?: string;
}

export interface JobLoggerContext extends RequestLoggerContext {
  jobId?: string | number;
  queue?: string;
}

export function getLogger(context?: Record<string, unknown>): Logger {
  if (!context) {
    return baseLogger;
  }
  const serviceName = process.env.SAMACHAT_SERVICE || 'unknown';
  if (!('service' in context) && serviceName) {
    return baseLogger.child({ service: serviceName, ...context });
  }
  return baseLogger.child(context);
}

export function createRequestLoggerContext(context: RequestLoggerContext): Record<string, unknown> {
  return {
    requestId: context.requestId,
    correlationId: context.correlationId,
    provider: context.provider,
    eventId: context.eventId,
    tenantId: context.tenantId,
    component: context.component,
  };
}

export function createJobLoggerContext(context: JobLoggerContext): Record<string, unknown> {
  return {
    jobId: context.jobId,
    queue: context.queue,
    requestId: context.requestId,
    correlationId: context.correlationId,
    provider: context.provider,
    eventId: context.eventId,
    tenantId: context.tenantId,
    component: context.component,
  };
}
