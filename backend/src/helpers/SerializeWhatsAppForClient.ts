import Whatsapp from "../models/Whatsapp";

type SerializableWhatsapp = Record<string, unknown> & {
  toJSON?: () => Record<string, unknown>;
};

const hasStoredValue = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const SerializeWhatsAppForClient = (
  whatsapp: Whatsapp
): Record<string, unknown> => {
  const source = whatsapp as unknown as SerializableWhatsapp;

  const data =
    typeof source.toJSON === "function"
      ? source.toJSON()
      : { ...source };

  const hasAccessToken = hasStoredValue(data.accessToken);
  const hasVerifyToken = hasStoredValue(data.verifyToken);
  const hasAppSecret = hasStoredValue(data.appSecret);

  delete data.accessToken;
  delete data.verifyToken;
  delete data.appSecret;

  return {
    ...data,
    hasAccessToken,
    hasVerifyToken,
    hasAppSecret
  };
};

export default SerializeWhatsAppForClient;