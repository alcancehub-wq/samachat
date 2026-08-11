import { Op, Transaction } from "sequelize";

import sequelize from "../../database";
import AppError from "../../errors/AppError";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import WhatsappDistributionUser from "../../models/WhatsappDistributionUser";
import WhatsappSharingSetting from "../../models/WhatsappSharingSetting";
import {
  DistributionMode,
  WhatsappSharingSettings,
  DEFAULT_WHATSAPP_SHARING_SETTINGS
} from "./GetWhatsAppSharingSettingsService";

interface Request {
  whatsappId: number;
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode?: string | null;
  distributionUserIds?: number[];
  transaction?: Transaction;
}

const normalizeWhatsappId = (value: number): number => {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new AppError("ERR_INVALID_WHATSAPP_ID", 400);
  }

  return normalized;
};

const normalizeUserIds = (values?: number[]): number[] =>
  Array.from(
    new Set(
      (values || [])
        .map(value => Number(value))
        .filter(value => Number.isInteger(value) && value > 0)
    )
  ).sort((a, b) => a - b);

const normalizeMode = (
  value?: string | null
): DistributionMode | null => {
  if (value === "random" || value === "round_robin") {
    return value;
  }

  return null;
};

const sameIds = (left: number[], right: number[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const buildDefault = (): WhatsappSharingSettings => ({
  ...DEFAULT_WHATSAPP_SHARING_SETTINGS,
  distributionUserIds: []
});

const SyncWhatsAppSharingSettingsService = async ({
  whatsappId,
  isShared,
  distributionEnabled,
  distributionMode,
  distributionUserIds = [],
  transaction
}: Request): Promise<WhatsappSharingSettings> => {
  const normalizedWhatsappId = normalizeWhatsappId(whatsappId);
  const normalizedUserIds = normalizeUserIds(distributionUserIds);
  const normalizedMode = normalizeMode(distributionMode);

  if (distributionEnabled && !isShared) {
    throw new AppError("ERR_DISTRIBUTION_REQUIRES_SHARING", 400);
  }

  if (distributionEnabled && !normalizedMode) {
    throw new AppError("ERR_INVALID_DISTRIBUTION_MODE", 400);
  }

  if (distributionEnabled && normalizedUserIds.length === 0) {
    throw new AppError("ERR_DISTRIBUTION_USERS_REQUIRED", 400);
  }

  const execute = async (
    activeTransaction: Transaction
  ): Promise<WhatsappSharingSettings> => {
    const whatsapp = await Whatsapp.findByPk(normalizedWhatsappId, {
      transaction: activeTransaction
    });

    if (!whatsapp) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }

    if (
      whatsapp.providerType === "official" &&
      (isShared || distributionEnabled)
    ) {
      throw new AppError(
        "ERR_OFFICIAL_CONNECTION_SHARING_NOT_ALLOWED",
        400
      );
    }

    const existingSetting = await WhatsappSharingSetting.findOne({
      where: { whatsappId: normalizedWhatsappId },
      transaction: activeTransaction
    });

    const existingDistributionUsers =
      await WhatsappDistributionUser.findAll({
        where: { whatsappId: normalizedWhatsappId },
        order: [["userId", "ASC"]],
        transaction: activeTransaction
      });

    if (!isShared) {
      await WhatsappDistributionUser.destroy({
        where: { whatsappId: normalizedWhatsappId },
        transaction: activeTransaction
      });

      await WhatsappSharingSetting.destroy({
        where: { whatsappId: normalizedWhatsappId },
        transaction: activeTransaction
      });

      return buildDefault();
    }

    if (!distributionEnabled) {
      await WhatsappDistributionUser.destroy({
        where: { whatsappId: normalizedWhatsappId },
        transaction: activeTransaction
      });

      const [setting] = await WhatsappSharingSetting.findOrCreate({
        where: { whatsappId: normalizedWhatsappId },
        defaults: {
          whatsappId: normalizedWhatsappId,
          isShared: true,
          distributionEnabled: false,
          distributionMode: null,
          lastAssignedUserId: null
        },
        transaction: activeTransaction
      });

      await setting.update(
        {
          isShared: true,
          distributionEnabled: false,
          distributionMode: null,
          lastAssignedUserId: null
        },
        { transaction: activeTransaction }
      );

      return {
        isShared: true,
        distributionEnabled: false,
        distributionMode: null,
        lastAssignedUserId: null,
        distributionUserIds: []
      };
    }

    const linkedUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: normalizedUserIds
        },
        whatsappId: normalizedWhatsappId
      },
      transaction: activeTransaction
    });

    if (linkedUsers.length !== normalizedUserIds.length) {
      throw new AppError("ERR_DISTRIBUTION_USER_NOT_LINKED", 400);
    }

    const existingUserIds = existingDistributionUsers
      .map(item => item.userId)
      .sort((a, b) => a - b);

    const modeChanged =
      !existingSetting ||
      existingSetting.distributionMode !== normalizedMode;

    const usersChanged = !sameIds(
      existingUserIds,
      normalizedUserIds
    );

    const nextLastAssignedUserId =
      !modeChanged && !usersChanged && existingSetting
        ? existingSetting.lastAssignedUserId || null
        : null;

    const [setting] = await WhatsappSharingSetting.findOrCreate({
      where: { whatsappId: normalizedWhatsappId },
      defaults: {
        whatsappId: normalizedWhatsappId,
        isShared: true,
        distributionEnabled: true,
        distributionMode: normalizedMode,
        lastAssignedUserId: nextLastAssignedUserId
      },
      transaction: activeTransaction
    });

    await setting.update(
      {
        isShared: true,
        distributionEnabled: true,
        distributionMode: normalizedMode,
        lastAssignedUserId: nextLastAssignedUserId
      },
      { transaction: activeTransaction }
    );

    await WhatsappDistributionUser.destroy({
      where: {
        whatsappId: normalizedWhatsappId,
        userId: {
          [Op.notIn]: normalizedUserIds
        }
      },
      transaction: activeTransaction
    });

    await Promise.all(
      normalizedUserIds.map(userId =>
        WhatsappDistributionUser.findOrCreate({
          where: {
            whatsappId: normalizedWhatsappId,
            userId
          },
          defaults: {
            whatsappId: normalizedWhatsappId,
            userId
          },
          transaction: activeTransaction
        })
      )
    );

    return {
      isShared: true,
      distributionEnabled: true,
      distributionMode: normalizedMode,
      lastAssignedUserId: nextLastAssignedUserId,
      distributionUserIds: normalizedUserIds
    };
  };

  if (transaction) {
    return execute(transaction);
  }

  return sequelize.transaction(
    async (newTransaction: Transaction) => execute(newTransaction)
  );
};

export default SyncWhatsAppSharingSettingsService;
