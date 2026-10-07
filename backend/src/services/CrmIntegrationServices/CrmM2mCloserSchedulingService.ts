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

const email =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validText = (
  value: unknown,
  maximum: number
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= maximum;

const validUtc = (
  value: unknown
): value is string =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value));

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

export interface CrmM2mCloserSchedulingDependencies {
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

export interface CrmM2mCloserAvailabilityInput {
  readonly localIntegrationId: number;
  readonly requestId: string;
  readonly startAt: string;
  readonly endAt: string;
}

export interface CrmM2mCloserCandidate {
  readonly name: string;
  readonly email: string;
}

export interface CrmM2mCloserAvailabilityReceipt {
  readonly schemaVersion: 1;
  readonly organizationId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly availableClosers:
    readonly CrmM2mCloserCandidate[];
}

export type CrmM2mCloserAvailabilityResult =
  | {
      readonly state: "disabled";
      readonly transportAccepted: false;
      readonly code: string;
    }
  | {
      readonly state: "available";
      readonly transportAccepted: true;
      readonly receipt: CrmM2mCloserAvailabilityReceipt;
    }
  | {
      readonly state:
        | "rejected"
        | "reconciliation_required";
      readonly transportAccepted: boolean;
      readonly code: string;
    };

export interface CrmM2mScheduleCloserMeetingInput {
  readonly localIntegrationId: number;
  readonly requestId: string;
  readonly sourceContactId: number;
  readonly closerEmail: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly title: string;
  readonly description?: string | null;
}

export interface CrmM2mScheduledMeetingReceipt {
  readonly status: "scheduled";
  readonly reused: boolean;
  readonly meetingId: string;
  readonly activityEventId: string | null;
  readonly rootDealId: string;
  readonly opportunityId: string;
  readonly routeId: string;
  readonly closerName: string;
  readonly closerEmail: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly handoffReady: true;
  readonly handoffStageName: "AGENDAMENTO";
  readonly destinationPipelineName: "CLOSER";
  readonly destinationStageName: "REUNIÃO AGENDADA";
}

export type CrmM2mScheduleCloserMeetingResult =
  | {
      readonly state: "disabled";
      readonly transportAccepted: false;
      readonly code: string;
    }
  | {
      readonly state: "scheduled";
      readonly transportAccepted: true;
      readonly receipt: CrmM2mScheduledMeetingReceipt;
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

interface AvailabilityWireRequest {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly operation: "get_closer_availability";
  readonly integration_id: string;
  readonly organization_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
  readonly start_at: string;
  readonly end_at: string;
}

interface ScheduleWireRequest {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly operation: "schedule_closer_meeting";
  readonly integration_id: string;
  readonly organization_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
  readonly source_contact_id: string;
  readonly closer_email: string;
  readonly start_at: string;
  readonly end_at: string;
  readonly title: string;
  readonly description: string | null;
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

function validTimeRange(
  startAt: string,
  endAt: string
): boolean {
  if (
    !validUtc(startAt) ||
    !validUtc(endAt)
  ) {
    return false;
  }

  const start = Date.parse(startAt);
  const end = Date.parse(endAt);

  return (
    end > start &&
    end - start <= 4 * 60 * 60 * 1000
  );
}

async function loadOperationalContext(
  localIntegrationId: number,
  dependencies: CrmM2mCloserSchedulingDependencies
): Promise<
  | {
      state: "ready";
      mapping: CrmIntegrationMappingSnapshot;
      secret: Uint8Array;
    }
  | {
      state: "disabled" | "rejected" | "reconciliation_required";
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

  let mapping: CrmIntegrationMappingSnapshot | null;

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
    mapping.localIntegrationId !== localIntegrationId ||
    !validateEndpoint(
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

async function sendSigned(
  mapping: CrmIntegrationMappingSnapshot,
  secret: Uint8Array,
  requestId: string,
  payload: AvailabilityWireRequest | ScheduleWireRequest,
  dependencies: CrmM2mCloserSchedulingDependencies
): Promise<
  | {
      state: "response";
      response: WireResponse;
    }
  | {
      state: "reconciliation_required";
      code: string;
    }
> {
  const now =
    (dependencies.now || (() => new Date()))();

  const sentAt = now.toISOString();
  const body = JSON.stringify(payload);

  if (Buffer.byteLength(body, "utf8") > 32768) {
    return {
      state: "reconciliation_required",
      code: "request_too_large"
    };
  }

  const signature =
    createHmac("sha256", secret)
      .update(
        `${sentAt}\n${requestId}\n${body}`,
        "utf8"
      )
      .digest("hex");

  const transport =
    dependencies.transport ||
    CrmM2mHttpsTransport;

  try {
    return {
      state: "response",
      response: await transport({
        url: mapping.endpoint,
        body,
        timeoutMs: 8000,
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "X-SamaChat-Signature-Version": "1",
          "X-SamaChat-Key-Id": mapping.keyId,
          "X-SamaChat-Sent-At": sentAt,
          "X-SamaChat-Event-Id": requestId,
          "X-SamaChat-Signature": signature
        }
      })
    };
  } catch {
    return {
      state: "reconciliation_required",
      code: "transport_uncertain"
    };
  }
}

export function ParseCrmM2mCloserAvailabilityReceipt(
  value: unknown
): CrmM2mCloserAvailabilityReceipt | null {
  if (!record(value)) {
    return null;
  }

  if (
    value.schema_version !== 1 ||
    typeof value.organization_id !== "string" ||
    !uuid.test(value.organization_id) ||
    !validUtc(value.start_at) ||
    !validUtc(value.end_at) ||
    !Array.isArray(value.available_closers) ||
    value.available_closers.length > 100
  ) {
    return null;
  }

  const candidates:
    CrmM2mCloserCandidate[] = [];

  for (const candidate of value.available_closers) {
    if (
      !record(candidate) ||
      !validText(candidate.name, 255) ||
      !validText(candidate.email, 255) ||
      !email.test(candidate.email)
    ) {
      return null;
    }

    candidates.push({
      name: candidate.name.trim(),
      email: candidate.email.trim().toLowerCase()
    });
  }

  return {
    schemaVersion: 1,
    organizationId: value.organization_id,
    startAt: value.start_at,
    endAt: value.end_at,
    availableClosers: candidates
  };
}

export function ParseCrmM2mScheduledMeetingReceipt(
  value: unknown
): CrmM2mScheduledMeetingReceipt | null {
  if (!record(value)) {
    return null;
  }

  const ids = [
    value.meeting_id,
    value.root_deal_id,
    value.opportunity_id,
    value.route_id
  ];

  if (
    value.status !== "scheduled" ||
    typeof value.reused !== "boolean" ||
    !ids.every(
      id =>
        typeof id === "string" &&
        uuid.test(id)
    ) ||
    !(
      value.activity_event_id === undefined ||
      value.activity_event_id === null ||
      (
        typeof value.activity_event_id === "string" &&
        uuid.test(value.activity_event_id)
      )
    ) ||
    !validText(value.closer_name, 255) ||
    !validText(value.closer_email, 255) ||
    !email.test(value.closer_email) ||
    !validUtc(value.start_at) ||
    !validUtc(value.end_at) ||
    value.handoff_ready !== true ||
    value.handoff_stage_name !== "AGENDAMENTO" ||
    value.destination_pipeline_name !== "CLOSER" ||
    value.destination_stage_name !== "REUNIÃO AGENDADA"
  ) {
    return null;
  }

  return {
    status: "scheduled",
    reused: value.reused,
    meetingId: value.meeting_id as string,
    activityEventId:
      typeof value.activity_event_id === "string"
        ? value.activity_event_id
        : null,
    rootDealId: value.root_deal_id as string,
    opportunityId: value.opportunity_id as string,
    routeId: value.route_id as string,
    closerName: (value.closer_name as string).trim(),
    closerEmail:
      (value.closer_email as string)
        .trim()
        .toLowerCase(),
    startAt: value.start_at as string,
    endAt: value.end_at as string,
    handoffReady: true,
    handoffStageName: "AGENDAMENTO",
    destinationPipelineName: "CLOSER",
    destinationStageName: "REUNIÃO AGENDADA"
  };
}

export async function GetCrmM2mCloserAvailability(
  input: CrmM2mCloserAvailabilityInput,
  dependencies: CrmM2mCloserSchedulingDependencies = {}
): Promise<CrmM2mCloserAvailabilityResult> {
  if (
    !uuid.test(input.requestId) ||
    !validTimeRange(
      input.startAt,
      input.endAt
    )
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "invalid_request"
    };
  }

  const context =
    await loadOperationalContext(
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

  const payload: AvailabilityWireRequest = {
    schema_version: 1,
    request_id: input.requestId,
    operation: "get_closer_availability",
    integration_id:
      context.mapping.identity.integrationId,
    organization_id:
      context.mapping.identity.organizationId,
    source_system: "samachat",
    source_instance_id:
      context.mapping.identity.sourceInstanceId,
    start_at: input.startAt,
    end_at: input.endAt
  };

  const wire =
    await sendSigned(
      context.mapping,
      context.secret,
      input.requestId,
      payload,
      dependencies
    );

  if (wire.state !== "response") {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: wire.code
    };
  }

  if (
    wire.response.status < 200 ||
    wire.response.status >= 300
  ) {
    return {
      state:
        [400, 401, 403, 404, 415, 422]
          .includes(wire.response.status)
          ? "rejected"
          : "reconciliation_required",
      transportAccepted: false,
      code: `http_${wire.response.status}`
    };
  }

  const receipt =
    ParseCrmM2mCloserAvailabilityReceipt(
      wire.response.body
    );

  if (
    !receipt ||
    receipt.organizationId !==
      context.mapping.identity.organizationId ||
    Date.parse(receipt.startAt) !== Date.parse(input.startAt) ||
    Date.parse(receipt.endAt) !== Date.parse(input.endAt)
  ) {
    return {
      state: "reconciliation_required",
      transportAccepted: true,
      code: "invalid_availability_receipt"
    };
  }

  return {
    state: "available",
    transportAccepted: true,
    receipt
  };
}

export async function ScheduleCrmM2mCloserMeeting(
  input: CrmM2mScheduleCloserMeetingInput,
  dependencies: CrmM2mCloserSchedulingDependencies = {}
): Promise<CrmM2mScheduleCloserMeetingResult> {
  if (
    !uuid.test(input.requestId) ||
    !Number.isSafeInteger(input.sourceContactId) ||
    input.sourceContactId < 1 ||
    !validText(input.closerEmail, 255) ||
    !email.test(input.closerEmail.trim()) ||
    !validTimeRange(
      input.startAt,
      input.endAt
    ) ||
    !validText(input.title, 200) ||
    (
      input.description !== undefined &&
      input.description !== null &&
      (
        typeof input.description !== "string" ||
        input.description.trim().length > 4000
      )
    )
  ) {
    return {
      state: "rejected",
      transportAccepted: false,
      code: "invalid_request"
    };
  }

  const context =
    await loadOperationalContext(
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

  const payload: ScheduleWireRequest = {
    schema_version: 1,
    request_id: input.requestId,
    operation: "schedule_closer_meeting",
    integration_id:
      context.mapping.identity.integrationId,
    organization_id:
      context.mapping.identity.organizationId,
    source_system: "samachat",
    source_instance_id:
      context.mapping.identity.sourceInstanceId,
    source_contact_id:
      String(input.sourceContactId),
    closer_email:
      input.closerEmail.trim().toLowerCase(),
    start_at: input.startAt,
    end_at: input.endAt,
    title: input.title.trim(),
    description:
      typeof input.description === "string"
        ? input.description.trim() || null
        : null
  };

  const wire =
    await sendSigned(
      context.mapping,
      context.secret,
      input.requestId,
      payload,
      dependencies
    );

  if (wire.state !== "response") {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: wire.code
    };
  }

  if (wire.response.status === 409) {
    return {
      state: "conflict",
      transportAccepted: false,
      code: "closer_schedule_conflict"
    };
  }

  if (
    wire.response.status < 200 ||
    wire.response.status >= 300
  ) {
    return {
      state:
        [400, 401, 403, 404, 415, 422]
          .includes(wire.response.status)
          ? "rejected"
          : "reconciliation_required",
      transportAccepted: false,
      code: `http_${wire.response.status}`
    };
  }

  const receipt =
    ParseCrmM2mScheduledMeetingReceipt(
      wire.response.body
    );

  if (
    !receipt ||
    receipt.meetingId !== input.requestId ||
    receipt.closerEmail !==
      input.closerEmail.trim().toLowerCase() ||
    Date.parse(receipt.startAt) !== Date.parse(input.startAt) ||
    Date.parse(receipt.endAt) !== Date.parse(input.endAt) ||
    receipt.handoffReady !== true
  ) {
    return {
      state: "reconciliation_required",
      transportAccepted: true,
      code: "invalid_schedule_receipt"
    };
  }

  return {
    state: "scheduled",
    transportAccepted: true,
    receipt
  };
}
