import { randomBytes } from "crypto";
import { Transaction } from "sequelize";

import sequelize from "../../database";
import AppError from "../../errors/AppError";
import Integration from "../../models/Integration";
import IntegrationCredential from "../../models/IntegrationCredential";

const ALLOWED_TYPES = ["HMAC_SECRET"];

const normalizeType = (value?: string): string => {
  const normalized = String(value || "HMAC_SECRET")
    .trim()
    .toUpperCase();

  if (!ALLOWED_TYPES.includes(normalized)) {
    throw new AppError("ERR_INTEGRATION_CREDENTIAL_TYPE_INVALID");
  }

  return normalized;
};

const maskSecret = (value?: string | null): string => {
  const secret = String(value || "");

  if (!secret) {
    return "";
  }

  return `********${secret.slice(-4)}`;
};

const ensureIntegration = async (
  integrationId: string | number,
  transaction?: Transaction
): Promise<Integration> => {
  const integration = await Integration.findByPk(integrationId, {
    transaction
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  return integration;
};

const toSafeCredential = (credential: IntegrationCredential) => ({
  id: credential.id,
  integrationId: credential.integrationId,
  name: credential.name,
  type: credential.type,
  maskedSecret: maskSecret(credential.secret),
  hasSecret: !!credential.secret,
  isDefault: credential.isDefault,
  isActive: credential.isActive,
  createdAt: credential.createdAt,
  updatedAt: credential.updatedAt
});

export const ListIntegrationCredentialsService = async ({
  integrationId
}: {
  integrationId: string | number;
}) => {
  await ensureIntegration(integrationId);

  const credentials = await IntegrationCredential.findAll({
    where: { integrationId },
    order: [
      ["isDefault", "DESC"],
      ["name", "ASC"]
    ]
  });

  return credentials.map(toSafeCredential);
};

export const SaveIntegrationCredentialService = async ({
  integrationId,
  credentialId,
  name,
  type = "HMAC_SECRET",
  secret,
  generate = false,
  isDefault,
  isActive
}: {
  integrationId: string | number;
  credentialId?: string | number;
  name: string;
  type?: string;
  secret?: string | null;
  generate?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
}) => {
  const cleanName = String(name || "").trim();
  const normalizedType = normalizeType(type);

  if (!cleanName) {
    throw new AppError("ERR_INTEGRATION_CREDENTIAL_NAME_REQUIRED");
  }

  const transaction = await sequelize.transaction();

  try {
    await ensureIntegration(integrationId, transaction);

    let credential: IntegrationCredential | null = null;

    if (credentialId) {
      credential = await IntegrationCredential.findOne({
        where: {
          id: credentialId,
          integrationId
        },
        transaction
      });

      if (!credential) {
        throw new AppError(
          "ERR_INTEGRATION_CREDENTIAL_NOT_FOUND",
          404
        );
      }
    }

    const duplicate = await IntegrationCredential.findOne({
      where: {
        integrationId,
        name: cleanName
      },
      transaction
    });

    if (
      duplicate &&
      (!credential || duplicate.id !== credential.id)
    ) {
      throw new AppError(
        "ERR_INTEGRATION_CREDENTIAL_DUPLICATED"
      );
    }

    let nextSecret =
      typeof secret === "string"
        ? secret.trim()
        : "";

    let revealedSecret: string | undefined;

    if (generate) {
      nextSecret = randomBytes(32).toString("hex");
      revealedSecret = nextSecret;
    }

    if (!credential && !nextSecret) {
      throw new AppError(
        "ERR_INTEGRATION_CREDENTIAL_SECRET_REQUIRED"
      );
    }

    const existingSameType =
      await IntegrationCredential.count({
        where: {
          integrationId,
          type: normalizedType
        },
        transaction
      });

    const nextDefault =
      typeof isDefault === "boolean"
        ? isDefault
        : credential
          ? credential.isDefault
          : existingSameType === 0;

    const nextActive =
      typeof isActive === "boolean"
        ? isActive
        : credential
          ? credential.isActive
          : true;

    if (nextDefault) {
      await IntegrationCredential.update(
        { isDefault: false },
        {
          where: {
            integrationId,
            type: normalizedType
          },
          transaction
        }
      );
    }

    if (credential) {
      await credential.update(
        {
          name: cleanName,
          type: normalizedType,
          secret: nextSecret || credential.secret,
          isDefault: nextDefault,
          isActive: nextActive
        },
        { transaction }
      );
    } else {
      credential = await IntegrationCredential.create(
        {
          integrationId,
          name: cleanName,
          type: normalizedType,
          secret: nextSecret,
          isDefault: nextDefault,
          isActive: nextActive
        },
        { transaction }
      );
    }

    await transaction.commit();

    return {
      credential: toSafeCredential(credential),
      ...(revealedSecret
        ? { revealedSecret }
        : {})
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const DeleteIntegrationCredentialService = async ({
  integrationId,
  credentialId
}: {
  integrationId: string | number;
  credentialId: string | number;
}): Promise<void> => {
  const credential = await IntegrationCredential.findOne({
    where: {
      id: credentialId,
      integrationId
    }
  });

  if (!credential) {
    throw new AppError(
      "ERR_INTEGRATION_CREDENTIAL_NOT_FOUND",
      404
    );
  }

  await credential.destroy();
};

export const GetDefaultIntegrationCredentialSecretService =
  async ({
    integrationId,
    type = "HMAC_SECRET"
  }: {
    integrationId: string | number;
    type?: string;
  }): Promise<string | null> => {
    const normalizedType = normalizeType(type);

    const credential = await IntegrationCredential.findOne({
      where: {
        integrationId,
        type: normalizedType,
        isDefault: true,
        isActive: true
      }
    });

    return credential?.secret || null;
  };