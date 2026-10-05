export interface CrmM2mRuntimeFlags {
  readonly captureEnabled: boolean;
  readonly deliveryEnabled: boolean;
  readonly executorEnabled: boolean;
}

const readFlag = (name: string): boolean => process.env[name] === "true";

export function ReadCrmM2mRuntimeFlags(): CrmM2mRuntimeFlags {
  return {
    captureEnabled: readFlag("SAMACHAT_CRM_M2M_CAPTURE_ENABLED"),
    deliveryEnabled: readFlag("SAMACHAT_CRM_M2M_DELIVERY_ENABLED"),
    executorEnabled: readFlag("SAMACHAT_CRM_M2M_EXECUTOR_ENABLED")
  };
}

export function ReadCrmM2mLocalIntegrationId(): number | null {
  const value = process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID;
  if (!value) return null;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("CRM_M2M_INTEGRATION_ID_INVALID");
  }
  const integrationId = Number(value);
  if (!Number.isSafeInteger(integrationId)) {
    throw new Error("CRM_M2M_INTEGRATION_ID_INVALID");
  }
  return integrationId;
}

export function NormalizeCrmM2mPhone(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
}
