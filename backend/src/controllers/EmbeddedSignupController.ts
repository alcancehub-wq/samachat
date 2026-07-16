import { Request, Response } from "express";

import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import SerializeWhatsAppForClient from "../helpers/SerializeWhatsAppForClient";
import ApplyEmbeddedSignupToExistingWhatsApp from "../services/CloudApiEmbeddedSignupServices/ApplyEmbeddedSignupToExistingWhatsApp";

interface EmbeddedSignupData {
  code?: string;
  sessionInfo?: {
    wabaId?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  };
}

const requireBackendEnvironmentValue = (
  value: string | undefined,
  errorCode: string
): string => {
  const normalized =
    typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new AppError(errorCode, 500);
  }

  return normalized;
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { code, sessionInfo }: EmbeddedSignupData = req.body || {};

  const appId = requireBackendEnvironmentValue(
    process.env.META_EMBEDDED_SIGNUP_APP_ID,
    "ERR_EMBEDDED_SIGNUP_APP_ID_NOT_CONFIGURED"
  );

  const appSecret = requireBackendEnvironmentValue(
    process.env.META_EMBEDDED_SIGNUP_APP_SECRET,
    "ERR_EMBEDDED_SIGNUP_APP_SECRET_NOT_CONFIGURED"
  );

  const whatsapp = await ApplyEmbeddedSignupToExistingWhatsApp({
    whatsappId,
    code: code || "",
    appId,
    appSecret,
    apiVersion:
      process.env.META_EMBEDDED_SIGNUP_API_VERSION || "v25.0",
    sessionInfo: {
      wabaId: sessionInfo?.wabaId || "",
      phoneNumberId: sessionInfo?.phoneNumberId || "",
      businessAccountId: sessionInfo?.businessAccountId
    }
  });

  const serializedWhatsApp =
    SerializeWhatsAppForClient(whatsapp);

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: serializedWhatsApp
  });

  return res.status(200).json(serializedWhatsApp);
};
