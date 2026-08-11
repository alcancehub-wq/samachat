import { Op, Transaction } from "sequelize";

import AppError from "../../errors/AppError";
import User from "../../models/User";

interface Request {
  whatsappId: number;
  linkedUserId?: number | null;
  linkedUserIds?: number[];
  linkedUserSignMessages?: boolean;
  transaction?: Transaction;
}

const normalizeUserIds = ({
  linkedUserId,
  linkedUserIds
}: Pick<Request, "linkedUserId" | "linkedUserIds">): number[] | undefined => {
  if (linkedUserIds !== undefined) {
    return Array.from(
      new Set(
        linkedUserIds
          .map(userId => Number(userId))
          .filter(userId => Number.isInteger(userId) && userId > 0)
      )
    );
  }

  if (linkedUserId === undefined) {
    return undefined;
  }

  if (linkedUserId === null) {
    return [];
  }

  const normalizedLinkedUserId = Number(linkedUserId);

  return Number.isInteger(normalizedLinkedUserId) && normalizedLinkedUserId > 0
    ? [normalizedLinkedUserId]
    : [];
};

const SyncWhatsAppLinkedUserService = async ({
  whatsappId,
  linkedUserId,
  linkedUserIds,
  linkedUserSignMessages,
  transaction
}: Request): Promise<void> => {
  const targetUserIds = normalizeUserIds({
    linkedUserId,
    linkedUserIds
  });

  if (targetUserIds === undefined) {
    return;
  }

  if (targetUserIds.length === 0) {
    if (transaction) {
      await User.update(
        { whatsappId: null },
        {
          where: { whatsappId },
          transaction
        }
      );
    } else {
      await User.update(
        { whatsappId: null },
        {
          where: { whatsappId }
        }
      );
    }

    return;
  }

  const users = transaction
    ? await User.findAll({
        where: {
          id: {
            [Op.in]: targetUserIds
          }
        },
        transaction
      })
    : await User.findAll({
        where: {
          id: {
            [Op.in]: targetUserIds
          }
        }
      });

  if (users.length !== targetUserIds.length) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  if (transaction) {
    await User.update(
      { whatsappId: null },
      {
        where: {
          whatsappId,
          id: {
            [Op.notIn]: targetUserIds
          }
        },
        transaction
      }
    );
  } else {
    await User.update(
      { whatsappId: null },
      {
        where: {
          whatsappId,
          id: {
            [Op.notIn]: targetUserIds
          }
        }
      }
    );
  }

  await Promise.all(
    users.map(async user => {
      const updateData: {
        whatsappId: number;
        signMessages?: boolean;
      } = {
        whatsappId
      };

      if (
        linkedUserIds === undefined &&
        typeof linkedUserSignMessages === "boolean"
      ) {
        updateData.signMessages = linkedUserSignMessages;
      }

      if (transaction) {
        await user.update(updateData, {
          transaction
        });
      } else {
        await user.update(updateData);
      }
    })
  );
};

export default SyncWhatsAppLinkedUserService;
