import * as Yup from "yup";
import { Transaction } from "sequelize";

import sequelize from "../../database";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "./SyncWhatsAppLinkedUserService";
import SyncWhatsAppSharingSettingsService from "./SyncWhatsAppSharingSettingsService";

interface SharingSettingsData {
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode?: string | null;
  distributionUserIds?: number[];
}

interface Request {
  name: string;
  queueIds?: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  linkedUserId?: number | null;
  linkedUserIds?: number[];
  linkedUserSignMessages?: boolean;
  providerType?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  apiVersion?: string;
  sharingSettings?: SharingSettingsData;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const normalizeIds = (values?: number[]): number[] =>
  Array.from(
    new Set(
      (values || [])
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)
    )
  );

const validateSharingContract = ({
  providerType,
  linkedUserIds,
  sharingSettings
}: {
  providerType: string;
  linkedUserIds?: number[];
  sharingSettings?: SharingSettingsData;
}): void => {
  if (!sharingSettings) {
    return;
  }

  const normalizedLinkedUserIds = normalizeIds(linkedUserIds);
  const distributionUserIds = normalizeIds(
    sharingSettings.distributionUserIds
  );

  if (
    providerType === "official" &&
    sharingSettings.isShared
  ) {
    throw new AppError(
      "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED",
      400
    );
  }

  if (
    !sharingSettings.isShared &&
    normalizedLinkedUserIds.length > 1
  ) {
    throw new AppError("ERR_SHARING_REQUIRED_FOR_MULTIPLE_USERS", 400);
  }

  if (
    sharingSettings.distributionEnabled &&
    distributionUserIds.some(
      userId => !normalizedLinkedUserIds.includes(userId)
    )
  ) {
    throw new AppError(
      "ERR_DISTRIBUTION_USERS_MUST_BE_LINKED",
      400
    );
  }
};

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  farewellMessage,
  isDefault = false,
  linkedUserId,
  linkedUserIds,
  linkedUserSignMessages,
  providerType = "web",
  wabaId,
  phoneNumberId,
  businessAccountId,
  accessToken,
  verifyToken,
  appSecret,
  apiVersion = "v20.0",
  sharingSettings
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

  validateSharingContract({
    providerType,
    linkedUserIds,
    sharingSettings
  });

  const whatsappFound = await Whatsapp.findOne();

  isDefault = !whatsappFound;

  if (
    providerType === "official" &&
    Array.isArray(linkedUserIds) &&
    normalizeIds(linkedUserIds).length > 1
  ) {
    throw new AppError("ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED");
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

  const execute = async (
    transaction?: Transaction
  ): Promise<Response> => {
    let oldDefaultWhatsapp: Whatsapp | null = null;

    if (isDefault) {
      oldDefaultWhatsapp = transaction
        ? await Whatsapp.findOne({
            where: { isDefault: true },
            transaction
          })
        : await Whatsapp.findOne({
            where: { isDefault: true }
          });

      if (oldDefaultWhatsapp) {
        if (transaction) {
          await oldDefaultWhatsapp.update(
            { isDefault: false },
            { transaction }
          );
        } else {
          await oldDefaultWhatsapp.update({ isDefault: false });
        }
      }
    }

    const createData = {
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
      cloudApiStatus:
        providerType === "official" ? "configured" : undefined,
      cloudApiLastError: null
    };

    const whatsapp = transaction
      ? await Whatsapp.create(createData, {
          include: ["queues"],
          transaction
        })
      : await Whatsapp.create(createData, {
          include: ["queues"]
        });

    await AssociateWhatsappQueue(
      whatsapp,
      queueIds,
      transaction
    );

    await SyncWhatsAppLinkedUserService({
      whatsappId: whatsapp.id,
      linkedUserId,
      linkedUserIds,
      linkedUserSignMessages,
      transaction
    });

    if (sharingSettings) {
      await SyncWhatsAppSharingSettingsService({
        whatsappId: whatsapp.id,
        ...sharingSettings,
        transaction
      });
    }

    return { whatsapp, oldDefaultWhatsapp };
  };

  if (!sharingSettings) {
    return execute();
  }

  return sequelize.transaction(
    async (transaction: Transaction) => execute(transaction)
  );
};

export default CreateWhatsAppService;
