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

  if (
    providerType === "official" &&
    (!phoneNumberId || !accessToken || !verifyToken)
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

  const whatsapp = await ShowWhatsAppService(whatsappId);

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
    updateData.wabaId = wabaId;
    updateData.phoneNumberId = phoneNumberId;
    updateData.businessAccountId = businessAccountId;
    updateData.accessToken = accessToken;
    updateData.verifyToken = verifyToken;
    updateData.appSecret = appSecret;
    updateData.apiVersion = apiVersion || "v20.0";
    updateData.cloudApiStatus = providerType === "official" ? "configured" : undefined;
    updateData.cloudApiLastError = undefined;
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
