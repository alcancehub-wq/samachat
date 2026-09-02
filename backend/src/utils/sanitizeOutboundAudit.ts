const SECRET_KEY_PATTERN = /access.?token|app.?secret|authorization|password|verify.?token/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+\/-]+/gi;

const sanitizeOutboundAudit = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(BEARER_PATTERN, "Bearer [REDACTED]");
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeOutboundAudit);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce(
      (sanitized, [key, nestedValue]) => ({
        ...sanitized,
        [key]: SECRET_KEY_PATTERN.test(key)
          ? "[REDACTED]"
          : sanitizeOutboundAudit(nestedValue)
      }),
      {} as Record<string, unknown>
    );
  }

  return value;
};

export const sanitizeOutboundAuditText = (value?: string): string | undefined =>
  typeof value === "string"
    ? String(sanitizeOutboundAudit(value))
    : value;

export default sanitizeOutboundAudit;