import * as Yup from "yup";
import { Op, Transaction } from "sequelize";

import sequelize from "../../database";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "./ShowWhatsAppService";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import SyncWhatsAppLinkedUserService from "./SyncWhatsAppLinkedUserService";
import SyncWhatsAppSharingSettingsService from "./SyncWhatsAppSharingSettingsService";

interface SharingSettingsData {
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode?: string | null;
  distributionUserIds?: number[];
}

interface WhatsappData {
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  farewellMessage?: string;
  queueIds?: number[];
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

const normalizeIds = (values?: number[]): number[] =>
  Array.from(
    new Set(
      (values || [])
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)
    )
  );

const validateSharingContract = ({
  effectiveProviderType,
  effectiveLinkedUserIds,
  sharingSettings
}: {
  effectiveProviderType: string;
  effectiveLinkedUserIds: number[];
  sharingSettings?: SharingSettingsData;
}): void => {
  if (!sharingSettings) {
    return;
  }

  const distributionUserIds = normalizeIds(
    sharingSettings.distributionUserIds
  );

  if (
    effectiveProviderType === "official" &&
    sharingSettings.isShared
  ) {
    throw new AppError(
      "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED",
      400
    );
  }

  if (
    !sharingSettings.isShared &&
    effectiveLinkedUserIds.length > 1
  ) {
    throw new AppError("ERR_SHARING_REQUIRED_FOR_MULTIPLE_USERS", 400);
  }

  if (
    sharingSettings.distributionEnabled &&
    distributionUserIds.some(
      userId => !effectiveLinkedUserIds.includes(userId)
    )
  ) {
    throw new AppError(
      "ERR_DISTRIBUTION_USERS_MUST_BE_LINKED",
      400
    );
  }
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
    linkedUserIds,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion,
    sharingSettings
  } = whatsappData;

  try {
    await schema.validate({ name, status, isDefault, providerType });
  } catch (err) {
    throw new AppError(err.message);
  }

  const whatsapp = await ShowWhatsAppService(whatsappId);

  const effectiveProviderType =
    providerType || whatsapp.providerType;

  const normalizedLinkedUserIds = Array.isArray(linkedUserIds)
    ? normalizeIds(linkedUserIds)
    : undefined;

  const existingLinkedUserIds = Array.isArray(whatsapp.users)
    ? whatsapp.users
        .map(user => Number(user.id))
        .filter(userId => Number.isInteger(userId) && userId > 0)
    : [];

  const effectiveLinkedUserIds =
    normalizedLinkedUserIds !== undefined
      ? normalizedLinkedUserIds
      : linkedUserId !== undefined
      ? linkedUserId === null
        ? []
        : normalizeIds([linkedUserId])
      : existingLinkedUserIds;

  validateSharingContract({
    effectiveProviderType,
    effectiveLinkedUserIds,
    sharingSettings
  });

  if (
    effectiveProviderType === "official" &&
    effectiveLinkedUserIds.length > 1
  ) {
    throw new AppError("ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED");
  }

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

  const execute = async (
    transaction?: Transaction
  ): Promise<Response> => {
    let oldDefaultWhatsapp: Whatsapp | null = null;

    if (isDefault) {
      oldDefaultWhatsapp = transaction
        ? await Whatsapp.findOne({
            where: {
              isDefault: true,
              id: { [Op.not]: whatsappId }
            },
            transaction
          })
        : await Whatsapp.findOne({
            where: {
              isDefault: true,
              id: { [Op.not]: whatsappId }
            }
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

    if (transaction) {
      await whatsapp.update(updateData, {
        transaction
      });
    } else {
      await whatsapp.update(updateData);
    }

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

export default UpdateWhatsAppService;
