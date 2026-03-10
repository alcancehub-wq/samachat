"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = getLogger;
exports.createRequestLoggerContext = createRequestLoggerContext;
exports.createJobLoggerContext = createJobLoggerContext;
const pino_1 = __importDefault(require("pino"));
const api_1 = require("@opentelemetry/api");
const config_1 = require("@samachat/config");
const config = (0, config_1.getConfig)();
const baseLogger = (0, pino_1.default)({
    level: config.logging.level,
    base: { service: process.env.SAMACHAT_SERVICE || 'unknown' },
    timestamp: () => `,\"timestamp\":\"${new Date().toISOString()}\"`,
    mixin() {
        const span = api_1.trace.getSpan(api_1.context.active());
        if (!span) {
            return {};
        }
        return { traceId: span.spanContext().traceId };
    },
});
function getLogger(context) {
    if (!context) {
        return baseLogger;
    }
    const serviceName = process.env.SAMACHAT_SERVICE || 'unknown';
    if (!('service' in context) && serviceName) {
        return baseLogger.child({ service: serviceName, ...context });
    }
    return baseLogger.child(context);
}
function createRequestLoggerContext(context) {
    return {
        requestId: context.requestId,
        correlationId: context.correlationId,
        provider: context.provider,
        eventId: context.eventId,
        tenantId: context.tenantId,
        component: context.component,
    };
}
function createJobLoggerContext(context) {
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
