import crypto from "crypto";

interface Request {
  rawBody?: Buffer;
  signature?: string | string[];
  secret?: string | null;
}

const normalizeSignature = (
  signature?: string | string[]
): string => {
  if (Array.isArray(signature)) {
    return signature[0] || "";
  }

  return signature || "";
};

const safeCompare = (expected: string, received: string): boolean => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const VerifyEduzzSignatureService = ({
  rawBody,
  signature,
  secret
}: Request): boolean => {
  if (!rawBody || !secret) {
    return false;
  }

  const received = normalizeSignature(signature)
    .replace(/^sha256=/i, "")
    .trim()
    .toLowerCase();

  if (!received) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")
    .toLowerCase();

  return safeCompare(expected, received);
};

export default VerifyEduzzSignatureService;
