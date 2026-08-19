import { Op, UniqueConstraintError } from "sequelize";

import WhatsappReconciliationCheckpoint from "../../models/WhatsappReconciliationCheckpoint";

type GetCheckpointInput = {
  whatsappId: number;
};

type SaveCheckpointInput = {
  whatsappId: number;
  checkpointAt: Date;
};

const assertWhatsappId = (whatsappId: number): void => {
  if (!Number.isInteger(whatsappId) || whatsappId <= 0) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }
};

const assertCheckpointAt = (checkpointAt: Date): void => {
  if (
    !(checkpointAt instanceof Date) ||
    Number.isNaN(checkpointAt.getTime())
  ) {
    throw new Error("ERR_INVALID_RECONCILIATION_CHECKPOINT");
  }
};

const isUniqueConstraintError = (error: unknown): boolean => {
  if (error instanceof UniqueConstraintError) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name ===
      "SequelizeUniqueConstraintError"
  );
};

export const getWhatsappReconciliationCheckpoint = async ({
  whatsappId
}: GetCheckpointInput): Promise<Date | null> => {
  assertWhatsappId(whatsappId);

  const checkpoint = await WhatsappReconciliationCheckpoint.findOne({
    where: { whatsappId }
  });

  return checkpoint ? checkpoint.checkpointAt : null;
};

export const saveWhatsappReconciliationCheckpoint = async ({
  whatsappId,
  checkpointAt
}: SaveCheckpointInput): Promise<Date> => {
  assertWhatsappId(whatsappId);
  assertCheckpointAt(checkpointAt);

  const existing = await WhatsappReconciliationCheckpoint.findOne({
    where: { whatsappId }
  });

  if (!existing) {
    try {
      const created = await WhatsappReconciliationCheckpoint.create({
        whatsappId,
        checkpointAt
      });

      return created.checkpointAt;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  await WhatsappReconciliationCheckpoint.update(
    {
      checkpointAt
    },
    {
      where: {
        whatsappId,
        checkpointAt: {
          [Op.lt]: checkpointAt
        }
      }
    }
  );

  const persisted = await WhatsappReconciliationCheckpoint.findOne({
    where: { whatsappId }
  });

  if (!persisted) {
    throw new Error(
      "ERR_RECONCILIATION_CHECKPOINT_PERSISTENCE_INCONSISTENT"
    );
  }

  return persisted.checkpointAt;
};