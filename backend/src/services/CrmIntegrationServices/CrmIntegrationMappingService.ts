import CrmIntegrationMapping from "../../models/CrmIntegrationMapping";
import type { CrmM2mIdentity } from "./CrmM2mClient";

export interface CrmIntegrationMappingInput {
  readonly localIntegrationId: number;
  readonly m2mIntegrationId: string;
  readonly organizationId: string;
  readonly sourceInstanceId: string;
  readonly endpoint: string;
  readonly approvedEndpoint: string;
  readonly keyId: string;
  readonly secretReference: string;
  readonly enabled: boolean;
  readonly mappingVersion: number;
}

export interface CrmIntegrationMappingSnapshot {
  readonly localIntegrationId: number;
  readonly identity: CrmM2mIdentity;
  readonly endpoint: string;
  readonly approvedEndpoint: string;
  readonly keyId: string;
  readonly secretReference: string;
  readonly enabled: boolean;
  readonly mappingVersion: number;
}

const validKeyId = /^[A-Za-z0-9._:-]{1,100}$/;
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validBoundedText = (
  value: unknown,
  maximum: number
): value is string =>
  typeof value === "string" &&
  value.trim() === value &&
  value.length > 0 &&
  value.length <= maximum;

function ValidateEndpoint(
  endpoint: string,
  approvedEndpoint: string
): void {
  let parsed: URL;

  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("CRM_MAPPING_INVALID");
  }

  if (
    endpoint !== approvedEndpoint ||
    parsed.protocol !== "https:" ||
    !!parsed.username ||
    !!parsed.password ||
    !!parsed.hash ||
    parsed.hostname.toLowerCase() === "webhook.site" ||
    parsed.pathname.toLowerCase().includes("lead-webhook")
  ) {
    throw new Error("CRM_MAPPING_INVALID");
  }
}

export function ValidateCrmIntegrationMapping(
  value: CrmIntegrationMappingInput
): CrmIntegrationMappingSnapshot {
  if (
    !value ||
    !Number.isSafeInteger(value.localIntegrationId) ||
    value.localIntegrationId < 1 ||
    typeof value.enabled !== "boolean" ||
    !Number.isSafeInteger(value.mappingVersion) ||
    value.mappingVersion < 1 ||
    !validBoundedText(value.m2mIntegrationId, 100) ||
    !validBoundedText(value.organizationId, 36) ||
    !validBoundedText(value.sourceInstanceId, 100) ||
    !validBoundedText(value.endpoint, 2048) ||
    !validBoundedText(value.approvedEndpoint, 2048) ||
    !validBoundedText(value.keyId, 100) ||
    !validKeyId.test(value.keyId) ||
    !validBoundedText(value.secretReference, 255)
  ) {
    throw new Error("CRM_MAPPING_INVALID");
  }

  const identity: CrmM2mIdentity = {
    integrationId: value.m2mIntegrationId,
    organizationId: value.organizationId,
    sourceInstanceId: value.sourceInstanceId
  };

  try {
    if (
      !uuidV4.test(identity.organizationId) ||
      ![identity.integrationId, identity.sourceInstanceId].every(
        item =>
          typeof item === "string" &&
          item.trim() === item &&
          item.length > 0 &&
          item.length <= 100
      )
    ) {
      throw new Error("CRM_MAPPING_IDENTITY_INVALID");
    }

    ValidateEndpoint(value.endpoint, value.approvedEndpoint);
  } catch {
    throw new Error("CRM_MAPPING_INVALID");
  }

  return {
    localIntegrationId: value.localIntegrationId,
    identity,
    endpoint: value.endpoint,
    approvedEndpoint: value.approvedEndpoint,
    keyId: value.keyId,
    secretReference: value.secretReference,
    enabled: value.enabled,
    mappingVersion: value.mappingVersion
  };
}

export function BuildCrmM2mIdentityFromMapping(
  mapping: CrmIntegrationMappingSnapshot
): CrmM2mIdentity {
  return {
    integrationId: mapping.identity.integrationId,
    organizationId: mapping.identity.organizationId,
    sourceInstanceId: mapping.identity.sourceInstanceId
  };
}

export async function LoadCrmIntegrationMapping(
  integrationId: number
): Promise<CrmIntegrationMappingSnapshot | null> {
  if (!Number.isSafeInteger(integrationId) || integrationId < 1) {
    throw new Error("CRM_MAPPING_INTEGRATION_ID_INVALID");
  }

  const mapping = await CrmIntegrationMapping.findByPk(integrationId, {
    attributes: [
      "integrationId",
      "m2mIntegrationId",
      "organizationId",
      "sourceInstanceId",
      "endpoint",
      "approvedEndpoint",
      "keyId",
      "secretReference",
      "m2mEnabled",
      "mappingVersion"
    ]
  });

  if (!mapping) {
    return null;
  }

  return ValidateCrmIntegrationMapping({
    localIntegrationId: mapping.integrationId,
    m2mIntegrationId: mapping.m2mIntegrationId,
    organizationId: mapping.organizationId,
    sourceInstanceId: mapping.sourceInstanceId,
    endpoint: mapping.endpoint,
    approvedEndpoint: mapping.approvedEndpoint,
    keyId: mapping.keyId,
    secretReference: mapping.secretReference,
    enabled: mapping.m2mEnabled,
    mappingVersion: mapping.mappingVersion
  });
}
