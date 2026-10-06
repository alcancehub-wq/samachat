import { createHmac } from "crypto";
import {
  CrmM2mHttpsTransport
} from "./CrmM2mClient";
import {
  CrmIntegrationMappingSnapshot,
  LoadCrmIntegrationMapping
} from "./CrmIntegrationMappingService";
import {
  ReadCrmM2mRuntimeFlags
} from "./CrmM2mRuntimeConfiguration";
import {
  ResolveCrmM2mSecret
} from "./CrmM2mSecretResolver";
import EnvironmentCrmM2mSecretProvider from "./EnvironmentCrmM2mSecretProvider";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validText = (
  value: unknown,
  maximum: number
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= maximum;

export interface CrmM2mSdrStageAdvanceInput {
  readonly localIntegrationId: number;
  readonly requestId: string;
  readonly sourceContactId: number;
  readonly pipelineName: string;
  readonly fromStageName: string;
  readonly toStageName: string;
  readonly reason?: string | null;
}

export interface CrmM2mSdrStageAdvanceReceipt {
  readonly status: "moved";
  readonly reused: boolean;
  readonly rootDealId: string;
  readonly opportunityId: string;
  readonly routeId: string;
  readonly pipelineId: string;
  readonly fromStageId: string;
  readonly toStageId: string;
  readonly responsibleUserId: string | null;
}

export type CrmM2mSdrStageAdvanceResult =
  | {
      readonly state: "disabled";
      readonly transportAccepted: false;
      readonly code: string;
    }
  | {
      readonly state: "moved";
      readonly transportAccepted: true;
      readonly receipt: CrmM2mSdrStageAdvanceReceipt;
    }
  | {
      readonly state: "rejected" | "reconciliation_required";
      readonly transportAccepted: boolean;
      readonly code: string;
    };

interface WireResponse {
  readonly status: number;
  readonly body: unknown;
}

type Transport = (
  request: {
    url: string;
    body: string;
    headers: Readonly<Record<string, string>>;
    timeoutMs: 8000;
    redirect: "error";
  }
) => Promise<WireResponse>;

export interface CrmM2mSdrStageAdvanceDependencies {
  readonly loadMapping?: (
    integrationId: number
  ) => Promise<CrmIntegrationMappingSnapshot | null>;

  readonly runtimeFlags?: typeof ReadCrmM2mRuntimeFlags;

  readonly resolveSecret?: (
    secretReference: string
  ) => Promise<Uint8Array>;

  readonly transport?: Transport;

  readonly now?: () => Date;
}

interface SdrStageWireRequest {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly operation: "advance_sdr_stage";
  readonly integration_id: string;
  readonly organization_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
  readonly source_contact_id: string;
  readonly pipeline_name: string;
  readonly from_stage_name: string;
  readonly to_stage_name: string;
  readonly reason: string | null;
}

function validateEndpoint(
  endpoint: string,
  approvedEndpoint: string
): boolean {
  try {
    const parsed = new URL(endpoint);

    return (
      endpoint === approvedEndpoint &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function buildRequest(
  input: CrmM2mSdrStageAdvanceInput,
  mapping: CrmIntegrationMappingSnapshot
): SdrStageWireRequest | null {
  if (
    !Number.isSafeInteger(input.localIntegrationId) ||
    input.localIntegrationId < 1 ||
    !uuid.test(input.requestId) ||
    !Number.isSafeInteger(input.sourceContactId) ||
    input.sourceContactId < 1 ||
    !validText(input.pipelineName, 150) ||
    !validText(input.fromStageName, 150) ||
    !validText(input.toStageName, 150) ||
    (
      input.reason !== undefined &&
      input.reason !== null &&
      !validText(input.reason, 500)
    )
  ) {
    return null;
  }

  const pipelineName = input.pipelineName.trim();
  const fromStageName = input.fromStageName.trim();
  const toStageName = input.toStageName.trim();

  if (
    fromStageName.toLowerCase() ===
    toStageName.toLowerCase()
  ) {
    return null;
  }

  return {
    schema_version: 1,
    request_id: input.requestId,
    operation: "advance_sdr_stage",
    integration_id: mapping.identity.integrationId,
    organization_id: mapping.identity.organizationId,
    source_system: "samachat",
    source_instance_id: mapping.identity.sourceInstanceId,
    source_contact_id: String(input.sourceContactId),
    pipeline_name: pipelineName,
    from_stage_name: fromStageName,
    to_stage_name: toStageName,
    reason:
      typeof input.reason === "string"
        ? input.reason.trim()
        : null
  };
}

export function ParseCrmM2mSdrStageAdvanceReceipt(
  value: unknown
): CrmM2mSdrStageAdvanceReceipt | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const row =
    value as Record<string, unknown>;

  const requiredIds = [
    row.root_deal_id,
    row.opportunity_id,
    row.route_id,
    row.pipeline_id,
    row.from_stage_id,
    row.to_stage_id
  ];

  if (
    row.status !== "moved" ||
    typeof row.reused !== "boolean" ||
    !requiredIds.every(
      id =>
        typeof id === "string" &&
        uuid.test(id)
    ) ||
    !(
      row.responsible_user_id === null ||
      (
        typeof row.responsible_user_id === "string" &&
        uuid.test(row.responsible_user_id)
      )
    )
  ) {
    return null;
  }

  return {
    status: "moved",
    reused: row.reused,
    rootDealId: row.root_deal_id as string,
    opportunityId: row.opportunity_id as string,
    routeId: row.route_id as string,
    pipelineId: row.pipeline_id as string,
    fromStageId: row.from_stage_id as string,
    toStageId: row.to_stage_id as string,
    responsibleUserId:
      row.responsible_user_id as string | null
  };
}

export default async function AdvanceCrmM2mSdrStage(
  input: CrmM2mSdrStageAdvanceInput,
  dependencies: CrmM2mSdrStageAdvanceDependencies = {}
): Promise<CrmM2mSdrStageAdvanceResult> {
  const readFlags =
    dependencies.runtimeFlags ||
    ReadCrmM2mRuntimeFlags;

  let flags;

  try {
    flags = readFlags();
  } catch {
    return {
      state: "disabled",
      transportAccepted: false,
      code: "runtime_configuration_invalid"
    };
  }

  if (!flags.deliveryEnabled) {
    return {
      state: "disabled",
      transportAccepted: false,
      code: "delivery_disabled"
    };
  }

  const loadMapping =
    dependencies.loadMapping ||
    LoadCrmIntegrationMapping;

  let mapping: CrmIntegrationMappingSnapshot | null;

  try {
    mapping =
      await loadMapping(
        input.localIntegrationId
      );
  } catch {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: "mapping_unavailable"
    };
  }

  if (
    !mapping ||
    !mapping.enabled ||
    !mapping.syncEnabled
  ) {
    return {
      state: "disabled",
      transportAccepted: false,
      code: "mapping_disabled"
    };
  }

  if (
    mapping.localIntegrationId !==
      input.localIntegrationId ||
    !validateEndpoint(
      mapping.endpoint,
      mapping.approvedEndpoint
    )
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "mapping_invalid"
    };
  }

  const payload = buildRequest(
    input,
    mapping
  );

  if (!payload) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "invalid_request"
    };
  }

  const resolveSecret =
    dependencies.resolveSecret ||
    (
      async (reference: string) =>
        ResolveCrmM2mSecret(
          reference,
          new EnvironmentCrmM2mSecretProvider()
        )
    );

  let secret: Uint8Array;

  try {
    secret =
      await resolveSecret(
        mapping.secretReference
      );
  } catch {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: "secret_unavailable"
    };
  }

  if (
    !(secret instanceof Uint8Array) ||
    secret.byteLength < 32
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "secret_invalid"
    };
  }

  const now =
    (dependencies.now || (() => new Date()))();

  const sentAt = now.toISOString();
  const body = JSON.stringify(payload);

  if (
    Buffer.byteLength(body, "utf8") > 32768
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "request_too_large"
    };
  }

  const signature = createHmac(
    "sha256",
    secret
  )
    .update(
      `${sentAt}\n${payload.request_id}\n${body}`,
      "utf8"
    )
    .digest("hex");

  const transport: Transport =
    dependencies.transport ||
    CrmM2mHttpsTransport;

  let response: WireResponse;

  try {
    response = await transport({
      url: mapping.endpoint,
      body,
      timeoutMs: 8000,
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "X-SamaChat-Signature-Version": "1",
        "X-SamaChat-Key-Id": mapping.keyId,
        "X-SamaChat-Sent-At": sentAt,
        "X-SamaChat-Event-Id":
          payload.request_id,
        "X-SamaChat-Signature":
          signature
      }
    });
  } catch {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: "transport_uncertain"
    };
  }

  const accepted =
    response.status >= 200 &&
    response.status < 300;

  if (!accepted) {
    if (
      [
        400,
        401,
        403,
        404,
        415,
        422
      ].includes(response.status)
    ) {
      return {
        state: "rejected",
        transportAccepted: false,
        code: `http_${response.status}`
      };
    }

    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: `http_${response.status}`
    };
  }

  const receipt =
    ParseCrmM2mSdrStageAdvanceReceipt(
      response.body
    );

  if (!receipt) {
    return {
      state: "reconciliation_required",
      transportAccepted: true,
      code: "invalid_stage_receipt"
    };
  }

  return {
    state: "moved",
    transportAccepted: true,
    receipt
  };
}
