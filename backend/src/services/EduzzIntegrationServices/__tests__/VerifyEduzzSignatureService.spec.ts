import crypto from "crypto";

import VerifyEduzzSignatureService from "../VerifyEduzzSignatureService";

describe("VerifyEduzzSignatureService", () => {
  const secret = "samachat-eduzz-test-secret";
  const rawBody = Buffer.from(
    JSON.stringify({
      id: "evt-001",
      event: "myeduzz.invoice_paid"
    })
  );

  it("accepts a valid HMAC SHA-256 signature", () => {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    expect(
      VerifyEduzzSignatureService({
        rawBody,
        signature,
        secret
      })
    ).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(
      VerifyEduzzSignatureService({
        rawBody,
        signature: "invalid-signature",
        secret
      })
    ).toBe(false);
  });

  it("rejects missing raw body", () => {
    expect(
      VerifyEduzzSignatureService({
        rawBody: undefined,
        signature: "anything",
        secret
      })
    ).toBe(false);
  });

  it("rejects missing secret", () => {
    expect(
      VerifyEduzzSignatureService({
        rawBody,
        signature: "anything",
        secret: ""
      })
    ).toBe(false);
  });
});
