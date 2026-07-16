import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "./ShowWhatsAppService";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "./SyncWhatsAppLinkedUserService";

interface WhatsappData {
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  farewellMessage?: string;
  queueIds?: number[];
  linkedUserId?: number | null;
  linkedUserSignMessages?: boolean;
  providerType?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  apiVersion?: string;
}

interface Request {
  whatsappData: WhatsappData;
  whatsappId: string;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const normalizeOptionalValue = (
  value?: string | null
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
};

const UpdateWhatsAppService = async ({
  whatsappData,
  whatsappId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    status: Yup.string(),
    isDefault: Yup.boolean(),
    providerType: Yup.string().oneOf(["web", "official"])
  });

  const {
    name,
    status,
    isDefault,
    session,
    greetingMessage,
    farewellMessage,
    queueIds = [],
    linkedUserId,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion
  } = whatsappData;

  try {
    await schema.validate({ name, status, isDefault, providerType });
  } catch (err) {
    throw new AppError(err.message);
  }

  const whatsapp = await ShowWhatsAppService(whatsappId);

  const effectiveProviderType =
    providerType || whatsapp.providerType;
  const effectivePhoneNumberId =
    normalizeOptionalValue(phoneNumberId) ||
    whatsapp.phoneNumberId;
  const effectiveAccessToken =
    normalizeOptionalValue(accessToken) ||
    whatsapp.accessToken;
  const effectiveVerifyToken =
    normalizeOptionalValue(verifyToken) ||
    whatsapp.verifyToken;

  if (
    effectiveProviderType === "official" &&
    (!effectivePhoneNumberId ||
      !effectiveAccessToken ||
      !effectiveVerifyToken)
  ) {
    throw new AppError("ERR_CLOUD_API_REQUIRED_FIELDS");
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true, id: { [Op.not]: whatsappId } }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
  }

  const updateData: Partial<Whatsapp> = {
    name,
    status,
    session,
    greetingMessage,
    farewellMessage,
    isDefault
  };

  if (providerType !== undefined) {
    updateData.providerType = providerType;
    updateData.apiVersion =
      normalizeOptionalValue(apiVersion) ||
      whatsapp.apiVersion ||
      "v20.0";
    updateData.cloudApiStatus =
      providerType === "official"
        ? "configured"
        : undefined;
    updateData.cloudApiLastError = undefined;
  }

  const normalizedWabaId =
    normalizeOptionalValue(wabaId);
  const normalizedPhoneNumberId =
    normalizeOptionalValue(phoneNumberId);
  const normalizedBusinessAccountId =
    normalizeOptionalValue(businessAccountId);
  const normalizedAccessToken =
    normalizeOptionalValue(accessToken);
  const normalizedVerifyToken =
    normalizeOptionalValue(verifyToken);
  const normalizedAppSecret =
    normalizeOptionalValue(appSecret);

  if (normalizedWabaId) {
    updateData.wabaId = normalizedWabaId;
  }

  if (normalizedPhoneNumberId) {
    updateData.phoneNumberId = normalizedPhoneNumberId;
  }

  if (normalizedBusinessAccountId) {
    updateData.businessAccountId =
      normalizedBusinessAccountId;
  }

  if (normalizedAccessToken) {
    updateData.accessToken = normalizedAccessToken;
  }

  if (normalizedVerifyToken) {
    updateData.verifyToken = normalizedVerifyToken;
  }

  if (normalizedAppSecret) {
    updateData.appSecret = normalizedAppSecret;
  }

  await whatsapp.update(updateData);

  await AssociateWhatsappQueue(whatsapp, queueIds);
  await SyncWhatsAppLinkedUserService({
    whatsappId: whatsapp.id,
    linkedUserId,
    linkedUserSignMessages
  });

  return { whatsapp, oldDefaultWhatsapp };
};

export default UpdateWhatsAppService;
