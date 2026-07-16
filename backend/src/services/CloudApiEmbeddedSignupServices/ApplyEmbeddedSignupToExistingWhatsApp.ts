import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import ExchangeEmbeddedSignupCode from "./ExchangeEmbeddedSignupCode";

interface EmbeddedSignupSessionInfo {
  wabaId: string;
  phoneNumberId: string;
  businessAccountId?: string;
}

interface Request {
  whatsappId: string | number;
  code: string;
  appId: string;
  appSecret: string;
  apiVersion?: string;
  sessionInfo: EmbeddedSignupSessionInfo;
}

const normalizeRequiredValue = (
  value: string | number | undefined,
  errorCode: string
): string => {
  const normalized =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
      ? value.trim()
      : "";

  if (!normalized) {
    throw new AppError(errorCode, 400);
  }

  return normalized;
};

const normalizeOptionalValue = (
  value: string | undefined
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const assertSameStoredIdentifier = (
  storedValue: string | null | undefined,
  receivedValue: string | undefined,
  errorCode: string
): void => {
  const stored = normalizeOptionalValue(storedValue || undefined);
  const received = normalizeOptionalValue(receivedValue);

  if (stored && received && stored !== received) {
    throw new AppError(errorCode, 409);
  }
};

const ApplyEmbeddedSignupToExistingWhatsApp = async ({
  whatsappId,
  code,
  appId,
  appSecret,
  apiVersion,
  sessionInfo
}: Request): Promise<Whatsapp> => {
  const normalizedWhatsappId = normalizeRequiredValue(
    whatsappId,
    "ERR_EMBEDDED_SIGNUP_WHATSAPP_ID_REQUIRED"
  );

  if (!/^\d+$/.test(normalizedWhatsappId)) {
    throw new AppError(
      "ERR_EMBEDDED_SIGNUP_INVALID_WHATSAPP_ID",
      400
    );
  }

  const normalizedWabaId = normalizeRequiredValue(
    sessionInfo?.wabaId,
    "ERR_EMBEDDED_SIGNUP_WABA_ID_REQUIRED"
  );

  const normalizedPhoneNumberId = normalizeRequiredValue(
    sessionInfo?.phoneNumberId,
    "ERR_EMBEDDED_SIGNUP_PHONE_NUMBER_ID_REQUIRED"
  );

  const normalizedBusinessAccountId = normalizeOptionalValue(
    sessionInfo?.businessAccountId
  );

  const whatsapp = await ShowWhatsAppService(normalizedWhatsappId);

  assertSameStoredIdentifier(
    whatsapp.wabaId,
    normalizedWabaId,
    "ERR_EMBEDDED_SIGNUP_WABA_ID_MISMATCH"
  );

  assertSameStoredIdentifier(
    whatsapp.phoneNumberId,
    normalizedPhoneNumberId,
    "ERR_EMBEDDED_SIGNUP_PHONE_NUMBER_ID_MISMATCH"
  );

  assertSameStoredIdentifier(
    whatsapp.businessAccountId,
    normalizedBusinessAccountId,
    "ERR_EMBEDDED_SIGNUP_BUSINESS_ACCOUNT_ID_MISMATCH"
  );

  const tokenResult = await ExchangeEmbeddedSignupCode({
    code,
    appId,
    appSecret,
    apiVersion
  });

  const updateData: Partial<Whatsapp> = {
    providerType: "official",
    wabaId: normalizedWabaId,
    phoneNumberId: normalizedPhoneNumberId,
    accessToken: tokenResult.accessToken,
    appSecret: appSecret.trim(),
    apiVersion:
      normalizeOptionalValue(apiVersion) ||
      whatsapp.apiVersion ||
      "v25.0",
    cloudApiStatus: "configured",
    cloudApiLastError: undefined
  };

  if (normalizedBusinessAccountId) {
    updateData.businessAccountId =
      normalizedBusinessAccountId;
  }

  await whatsapp.update(updateData);

  return whatsapp;
};

export default ApplyEmbeddedSignupToExistingWhatsApp;
