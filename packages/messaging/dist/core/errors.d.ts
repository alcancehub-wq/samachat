export declare class MessagingError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map