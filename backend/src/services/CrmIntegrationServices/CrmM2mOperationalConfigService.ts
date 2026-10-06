import AppError from "../../errors/AppError";
import CrmIntegrationMapping from "../../models/CrmIntegrationMapping";

export interface CrmM2mOperationalConfigInput {
  readonly m2mEnabled: boolean;
  readonly syncEnabled: boolean;
  readonly commercialAdmissionEnabled: boolean;
  readonly commercialPipelineName?: string | null;
  readonly commercialStageName?: string | null;
  readonly commercialOwnerEmail?: string | null;
}

const normalizeOptional = (
  value: unknown,
  maximum: number
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError(
      "ERR_CRM_M2M_CONFIG_INVALID",
      400
    );
  }

  const normalized = value.trim();

  if (!normalized) return null;

  if (normalized.length > maximum) {
    throw new AppError(
      "ERR_CRM_M2M_CONFIG_INVALID",
      400
    );
  }

  return normalized;
};

export async function GetCrmM2mOperationalConfig(
  integrationId: number
) {
  const mapping =
    await CrmIntegrationMapping.findByPk(
      integrationId
    );

  if (!mapping) {
    throw new AppError(
      "ERR_CRM_M2M_MAPPING_NOT_FOUND",
      404
    );
  }

  return {
    integrationId: mapping.integrationId,
    m2mEnabled: Boolean(mapping.m2mEnabled),
    syncEnabled: Boolean(mapping.syncEnabled),
    commercialAdmissionEnabled:
      Boolean(mapping.commercialAdmissionEnabled),
    commercialPipelineName:
      mapping.commercialPipelineName || null,
    commercialStageName:
      mapping.commercialStageName || null,
    commercialOwnerEmail:
      mapping.commercialOwnerEmail || null
  };
}

export async function UpdateCrmM2mOperationalConfig(
  integrationId: number,
  input: CrmM2mOperationalConfigInput
) {
  if (
    !input ||
    typeof input.m2mEnabled !== "boolean" ||
    typeof input.syncEnabled !== "boolean" ||
    typeof input.commercialAdmissionEnabled
      !== "boolean"
  ) {
    throw new AppError(
      "ERR_CRM_M2M_CONFIG_INVALID",
      400
    );
  }

  const mapping =
    await CrmIntegrationMapping.findByPk(
      integrationId
    );

  if (!mapping) {
    throw new AppError(
      "ERR_CRM_M2M_MAPPING_NOT_FOUND",
      404
    );
  }

  const commercialPipelineName =
    normalizeOptional(
      input.commercialPipelineName,
      150
    );

  const commercialStageName =
    normalizeOptional(
      input.commercialStageName,
      150
    );

  const rawOwnerEmail =
    normalizeOptional(
      input.commercialOwnerEmail,
      255
    );

  const commercialOwnerEmail =
    rawOwnerEmail
      ? rawOwnerEmail.toLowerCase()
      : null;

  if (
    commercialOwnerEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      commercialOwnerEmail
    )
  ) {
    throw new AppError(
      "ERR_CRM_M2M_OWNER_EMAIL_INVALID",
      400
    );
  }

  const m2mEnabled =
    input.m2mEnabled === true;

  const syncEnabled =
    m2mEnabled &&
    input.syncEnabled === true;

  const commercialAdmissionEnabled =
    syncEnabled &&
    input.commercialAdmissionEnabled === true;

  if (
    commercialAdmissionEnabled &&
    (
      !commercialPipelineName ||
      !commercialStageName
    )
  ) {
    throw new AppError(
      "ERR_CRM_M2M_ADMISSION_DESTINATION_REQUIRED",
      400
    );
  }

  await mapping.update({
    m2mEnabled,
    syncEnabled,
    commercialAdmissionEnabled,
    commercialPipelineName,
    commercialStageName,
    commercialOwnerEmail
  });

  return GetCrmM2mOperationalConfig(
    integrationId
  );
}
