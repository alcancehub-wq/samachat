import sanitizeOutboundAudit, {
  sanitizeOutboundAuditText
} from "../sanitizeOutboundAudit";

describe("sanitizeOutboundAudit", () => {
  it("redacts secret fields recursively", () => {
    expect(
      sanitizeOutboundAudit({
        accessToken: "secret",
        nested: { appSecret: "secret", permitted: "value" },
        authorization: "Bearer secret"
      })
    ).toEqual({
      accessToken: "[REDACTED]",
      nested: { appSecret: "[REDACTED]", permitted: "value" },
      authorization: "[REDACTED]"
    });
  });

  it("redacts bearer credentials in text", () => {
    expect(sanitizeOutboundAuditText("failed Authorization: Bearer abc.def-123"))
      .toBe("failed Authorization: Bearer [REDACTED]");
  });
});