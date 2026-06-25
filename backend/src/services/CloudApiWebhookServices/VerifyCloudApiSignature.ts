import crypto from "crypto";

const SIGNATURE_HEADER_PREFIX = "sha256=";

const safeCompare = (expected: string, received: string): boolean => {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const VerifyCloudApiSignature = ({
  appSecret,
  rawBody,
  signature
}: {
  appSecret?: string | null;
  rawBody?: string | Buffer | null;
  signature?: string | string[] | null;
}): boolean => {
  const cleanSecret = (appSecret || "").trim();

  if (!cleanSecret) {
    return true;
  }

  const receivedSignature = Array.isArray(signature)
    ? signature[0] || ""
    : signature || "";

  if (!receivedSignature.startsWith(SIGNATURE_HEADER_PREFIX)) {
    return false;
  }

  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody || "", "utf8");

  const expectedSignature = `${SIGNATURE_HEADER_PREFIX}${crypto
    .createHmac("sha256", cleanSecret)
    .update(bodyBuffer)
    .digest("hex")}`;

  return safeCompare(expectedSignature, receivedSignature);
};

export default VerifyCloudApiSignature;
