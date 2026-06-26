import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "./SyncWhatsAppLinkedUserService";

interface Request {
  name: string;
  queueIds?: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
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

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  farewellMessage,
  isDefault = false,
  linkedUserId,
  linkedUserSignMessages,
  providerType = "web",
  wabaId,
  phoneNumberId,
  businessAccountId,
  accessToken,
  verifyToken,
  appSecret,
  apiVersion = "v20.0"
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string()
      .required()
      .min(2)
      .test(
        "Check-name",
        "This whatsapp name is already used.",
        async value => {
          if (!value) return false;
          const nameExists = await Whatsapp.findOne({
            where: { name: value }
          });
          return !nameExists;
        }
      ),
    isDefault: Yup.boolean().required(),
    providerType: Yup.string().oneOf(["web", "official"])
  });

  try {
    await schema.validate({ name, status, isDefault, providerType });
  } catch (err) {
    throw new AppError(err.message);
  }

  const whatsappFound = await Whatsapp.findOne();

  isDefault = !whatsappFound;

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
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

  const whatsapp = await Whatsapp.create(
    {
      name,
      status,
      greetingMessage,
      farewellMessage,
      isDefault,
      providerType,
      wabaId,
      phoneNumberId,
      businessAccountId,
      accessToken,
      verifyToken,
      appSecret,
      apiVersion,
      cloudApiStatus: providerType === "official" ? "configured" : undefined,
      cloudApiLastError: null
    },
    { include: ["queues"] }
  );

  await AssociateWhatsappQueue(whatsapp, queueIds);
  await SyncWhatsAppLinkedUserService({
    whatsappId: whatsapp.id,
    linkedUserId,
    linkedUserSignMessages
  });

  return { whatsapp, oldDefaultWhatsapp };
};

export default CreateWhatsAppService;
