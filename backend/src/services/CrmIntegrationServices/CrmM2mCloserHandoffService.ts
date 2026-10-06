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

const record = (
  value: unknown
): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value);

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

export interface CrmM2mCloserHandoffDependencies {
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

export interface CrmM2mCloserHandoffInput {
  readonly localIntegrationId: number;
  readonly requestId: string;
  readonly sourceContactId: number;
  readonly meetingId: string;
}

export interface CrmM2mCloserHandoffReceipt {
  readonly status: "handed_off";
  readonly reused: boolean;
  readonly meetingId: string;
  readonly rootDealId: string;
  readonly opportunityId: string;
  readonly routeId: string;
  readonly eventId: string;
  readonly currentPipelineId: string;
  readonly currentStageId: string;
  readonly responsibleUserId: string;
  readonly deliveredByUserId: string | null;
}

export type CrmM2mCloserHandoffResult =
  | {
      readonly state: "disabled";
      readonly transportAccepted: false;
      readonly code: string;
    }
  | {
      readonly state: "handed_off";
      readonly transportAccepted: true;
      readonly receipt: CrmM2mCloserHandoffReceipt;
    }
  | {
      readonly state: "conflict";
      readonly transportAccepted: false;
      readonly code: string;
    }
  | {
      readonly state:
        | "rejected"
        | "reconciliation_required";
      readonly transportAccepted: boolean;
      readonly code: string;
    };

interface HandoffWireRequest {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly operation: "handoff_to_closer";
  readonly integration_id: string;
  readonly organization_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
  readonly source_contact_id: string;
  readonly meeting_id: string;
}

function validEndpoint(
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

async function operationalContext(
  localIntegrationId: number,
  dependencies: CrmM2mCloserHandoffDependencies
): Promise<
  | {
      state: "ready";
      mapping: CrmIntegrationMappingSnapshot;
      secret: Uint8Array;
    }
  | {
      state:
        | "disabled"
        | "rejected"
        | "reconciliation_required";
      code: string;
    }
> {
  const readFlags =
    dependencies.runtimeFlags ||
    ReadCrmM2mRuntimeFlags;

  let flags;

  try {
    flags = readFlags();
  } catch {
    return {
      state: "disabled",
      code: "runtime_configuration_invalid"
    };
  }

  if (!flags.deliveryEnabled) {
    return {
      state: "disabled",
      code: "delivery_disabled"
    };
  }

  if (
    !Number.isSafeInteger(localIntegrationId) ||
    localIntegrationId < 1
  ) {
    return {
      state: "rejected",
      code: "invalid_local_integration"
    };
  }

  const loadMapping =
    dependencies.loadMapping ||
    LoadCrmIntegrationMapping;

  let mapping:
    CrmIntegrationMappingSnapshot | null;

  try {
    mapping =
      await loadMapping(localIntegrationId);
  } catch {
    return {
      state: "reconciliation_required",
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
      code: "mapping_disabled"
    };
  }

  if (
    mapping.localIntegrationId !==
      localIntegrationId ||
    !validEndpoint(
      mapping.endpoint,
      mapping.approvedEndpoint
    )
  ) {
    return {
      state: "rejected",
      code: "mapping_invalid"
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
      code: "secret_unavailable"
    };
  }

  if (
    !(secret instanceof Uint8Array) ||
    secret.byteLength < 32
  ) {
    return {
      state: "rejected",
      code: "secret_invalid"
    };
  }

  return {
    state: "ready",
    mapping,
    secret
  };
}

export function ParseCrmM2mCloserHandoffReceipt(
  value: unknown
): CrmM2mCloserHandoffReceipt | null {
  if (!record(value)) {
    return null;
  }

  const ids = [
    value.meeting_id,
    value.root_deal_id,
    value.opportunity_id,
    value.route_id,
    value.event_id,
    value.current_pipeline_id,
    value.current_stage_id,
    value.responsible_user_id
  ];

  if (
    value.status !== "handed_off" ||
    typeof value.reused !== "boolean" ||
    !ids.every(
      item =>
        typeof item === "string" &&
        uuid.test(item)
    ) ||
    !(
      value.delivered_by_user_id === undefined ||
      value.delivered_by_user_id === null ||
      (
        typeof value.delivered_by_user_id === "string" &&
        uuid.test(value.delivered_by_user_id)
      )
    )
  ) {
    return null;
  }

  return {
    status: "handed_off",
    reused: value.reused,
    meetingId: value.meeting_id as string,
    rootDealId: value.root_deal_id as string,
    opportunityId:
      value.opportunity_id as string,
    routeId: value.route_id as string,
    eventId: value.event_id as string,
    currentPipelineId:
      value.current_pipeline_id as string,
    currentStageId:
      value.current_stage_id as string,
    responsibleUserId:
      value.responsible_user_id as string,
    deliveredByUserId:
      typeof value.delivered_by_user_id === "string"
        ? value.delivered_by_user_id
        : null
  };
}

export async function HandoffCrmM2mCloser(
  input: CrmM2mCloserHandoffInput,
  dependencies: CrmM2mCloserHandoffDependencies = {}
): Promise<CrmM2mCloserHandoffResult> {
  if (
    !uuid.test(input.requestId) ||
    !uuid.test(input.meetingId) ||
    !Number.isSafeInteger(input.sourceContactId) ||
    input.sourceContactId < 1
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "invalid_request"
    };
  }

  const context =
    await operationalContext(
      input.localIntegrationId,
      dependencies
    );

  if (context.state !== "ready") {
    return {
      state: context.state,
      transportAccepted: false,
      code: context.code
    };
  }

  const payload: HandoffWireRequest = {
    schema_version: 1,
    request_id: input.requestId,
    operation: "handoff_to_closer",
    integration_id:
      context.mapping.identity.integrationId,
    organization_id:
      context.mapping.identity.organizationId,
    source_system: "samachat",
    source_instance_id:
      context.mapping.identity.sourceInstanceId,
    source_contact_id:
      String(input.sourceContactId),
    meeting_id: input.meetingId
  };

  const now =
    (dependencies.now || (() => new Date()))();

  const sentAt = now.toISOString();
  const body = JSON.stringify(payload);

  const signature =
    createHmac("sha256", context.secret)
      .update(
        `${sentAt}\n${input.requestId}\n${body}`,
        "utf8"
      )
      .digest("hex");

  const transport =
    dependencies.transport ||
    CrmM2mHttpsTransport;

  let response: WireResponse;

  try {
    response =
      await transport({
        url: context.mapping.endpoint,
        body,
        timeoutMs: 8000,
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "X-SamaChat-Signature-Version": "1",
          "X-SamaChat-Key-Id":
            context.mapping.keyId,
          "X-SamaChat-Sent-At": sentAt,
          "X-SamaChat-Event-Id":
            input.requestId,
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

  if (response.status === 409) {
    return {
      state: "conflict",
      transportAccepted: false,
      code: "closer_handoff_conflict"
    };
  }

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    return {
      state:
        [400, 401, 403, 404, 415, 422]
          .includes(response.status)
          ? "rejected"
          : "reconciliation_required",
      transportAccepted: false,
      code: `http_${response.status}`
    };
  }

  const receipt =
    ParseCrmM2mCloserHandoffReceipt(
      response.body
    );

  if (
    !receipt ||
    receipt.meetingId !== input.meetingId
  ) {
    return {
      state: "reconciliation_required",
      transportAccepted: true,
      code: "invalid_handoff_receipt"
    };
  }

  return {
    state: "handed_off",
    transportAccepted: true,
    receipt
  };
}
