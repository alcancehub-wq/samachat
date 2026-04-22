import { context, propagation, trace } from '@opentelemetry/api';

export type TraceCarrier = Record<string, string>;

export function extractTraceContext(carrier?: TraceCarrier) {
  if (!carrier) {
    return context.active();
  }
  return propagation.extract(context.active(), carrier);
}

export function injectTraceContext(): TraceCarrier {
  const carrier: TraceCarrier = {};
  propagation.inject(context.active(), carrier);
  return carrier;
}

export function getTracer() {
  return trace.getTracer('samachat-api');
}
