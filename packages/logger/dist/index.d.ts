import pino from 'pino';
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
export declare function getLogger(context?: Record<string, unknown>): Logger;
export declare function createRequestLoggerContext(context: RequestLoggerContext): Record<string, unknown>;
export declare function createJobLoggerContext(context: JobLoggerContext): Record<string, unknown>;
//# sourceMappingURL=index.d.ts.map