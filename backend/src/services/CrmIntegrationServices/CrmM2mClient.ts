import { createHmac } from "crypto";
import { request as httpsRequest } from "https";
import { CrmContactIntentDecision } from "./BuildCrmContactIntentService";

export interface CrmM2mIdentity {
  readonly integrationId: string;
  readonly organizationId: string;
  readonly sourceInstanceId: string;
}

export interface CrmM2mCommercialRequest {
  readonly enabled: true;
  readonly pipeline_name: string;
  readonly stage_name: string;
  readonly owner_email: string | null;
}
export interface CrmM2mEnvelope {
  readonly schema_version: 1;
  readonly event_id: string;
  readonly event_name:
    | "samachat.crm.contact.upsert.requested"
    | "samachat.crm.operation.receipt.requested";
  readonly occurred_at: string;
  readonly correlation_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
  readonly integration_id: string;
  readonly organization_id: string;
  readonly operation: "upsert_contact" | "get_receipt";
  readonly source_contact_id: string;
  readonly source_revision: number;
  readonly context: {
    readonly channel: "whatsapp_inbound" | "manual";
    readonly provenance: "realtime" | "manual";
    readonly from_me: false;
    readonly is_group: false;
    readonly whatsapp_connection_id?: string;
  };
  readonly data: {
    readonly phone_e164: string;
    readonly display_name: string | null;
    readonly capture_channel: string | null;
    readonly registration: {
      readonly complete: boolean;
      readonly missing_fields: readonly string[];
    };
    readonly commercial_request?: CrmM2mCommercialRequest;
  };
}
export interface CrmM2mReceipt {
  readonly schema_version: 1;
  readonly event_id: string;
  readonly organization_id: string;
  readonly correlation_id: string;
  readonly receipt_id: string;
  readonly processing_state:
    | "accepted"
    | "processed"
    | "deferred_identity"
    | "partial"
    | "failed"
    | "ignored";
  readonly contact_result: {
    readonly status:
      | "not_persisted"
      | "created"
      | "reused"
      | "enriched"
      | "conflict";
    readonly crm_contact_id: string | null;
    readonly persisted_at: string | null;
  };
  readonly commercial_result: {
    readonly status:
      | "not_requested"
      | "created"
      | "reused"
      | "deferred";
    readonly primary_deal_id: string | null;
    readonly opportunity_id: string | null;
  };
  readonly error: { readonly code: string; readonly retryable: boolean } | null;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const utc = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function BuildCrmM2mEnvelope(
  decision: CrmContactIntentDecision,
  identity: CrmM2mIdentity,
  event: {
    readonly id: string;
    readonly correlationId: string;
    readonly occurredAt: string;
    readonly revision: number;
  },
  context: CrmM2mEnvelope["context"]
): CrmM2mEnvelope | null {
  if (decision.status !== "candidate") return null;
  if (
    !uuid.test(identity.organizationId) ||
    !uuid.test(event.id) ||
    !uuid.test(event.correlationId) ||
    !utc(event.occurredAt) ||
    !Number.isSafeInteger(event.revision) ||
    event.revision < 1 ||
    !identity.integrationId.trim() ||
    identity.integrationId.length > 100 ||
    !identity.sourceInstanceId.trim() ||
    identity.sourceInstanceId.length > 100 ||
    context.from_me !== false ||
    context.is_group !== false ||
    !(
      (context.channel === "manual" && context.provenance === "manual") ||
      (context.channel === "whatsapp_inbound" &&
        context.provenance === "realtime")
    )
  ) {
    throw new Error("M2M_INVALID_EXPLICIT_IDENTITY_OR_CONTEXT");
  }
  const candidate = decision.candidate;
  return {
    schema_version: 1,
    event_id: event.id,
    event_name: "samachat.crm.contact.upsert.requested",
    occurred_at: event.occurredAt,
    correlation_id: event.correlationId,
    source_system: "samachat",
    source_instance_id: identity.sourceInstanceId,
    integration_id: identity.integrationId,
    organization_id: identity.organizationId,
    operation: "upsert_contact",
    source_contact_id: candidate.source_contact_id,
    source_revision: event.revision,
    context: { ...context },
    data: {
      phone_e164: candidate.data.phone_e164,
      display_name: candidate.data.display_name,
      capture_channel: candidate.data.capture_channel,
      registration: {
        complete: candidate.data.registration.complete,
        missing_fields: [...candidate.data.registration.missingFields]
      }
    }
  };
}

export function ParseCrmM2mReceipt(
  value: unknown,
  envelope: CrmM2mEnvelope
): CrmM2mReceipt | null {
  if (
    !record(value) ||
    !record(value.contact_result) ||
    !record(value.commercial_result)
  )
    return null;
  const contact = value.contact_result;
  const commercial = value.commercial_result;
  const confirmed = ["created", "reused", "enriched"].includes(
    String(contact.status)
  );

  const commercialRequested =
    envelope.data.commercial_request?.enabled === true;

  const commercialStatus =
    String(commercial.status);

  const commercialValid =
    (
      !commercialRequested &&
      commercialStatus === "not_requested" &&
      commercial.primary_deal_id === null &&
      commercial.opportunity_id === null
    ) ||
    (
      commercialRequested &&
      ["created", "reused"].includes(commercialStatus) &&
      typeof commercial.primary_deal_id === "string" &&
      uuid.test(commercial.primary_deal_id) &&
      typeof commercial.opportunity_id === "string" &&
      uuid.test(commercial.opportunity_id)
    ) ||
    (
      commercialRequested &&
      commercialStatus === "deferred" &&
      (
        commercial.primary_deal_id === null ||
        (
          typeof commercial.primary_deal_id === "string" &&
          uuid.test(commercial.primary_deal_id)
        )
      ) &&
      commercial.opportunity_id === null
    );

  if (
    value.schema_version !== 1 ||
    value.event_id !== envelope.event_id ||
    value.organization_id !== envelope.organization_id ||
    value.correlation_id !== envelope.correlation_id ||
    typeof value.receipt_id !== "string" ||
    !uuid.test(value.receipt_id) ||
    ![
      "accepted",
      "processed",
      "deferred_identity",
      "partial",
      "failed",
      "ignored"
    ].includes(String(value.processing_state)) ||
    !["not_persisted", "created", "reused", "enriched", "conflict"].includes(
      String(contact.status)
    ) ||
    (confirmed
      ? typeof contact.crm_contact_id !== "string" ||
        !uuid.test(contact.crm_contact_id) ||
        !utc(contact.persisted_at)
      : contact.crm_contact_id !== null || contact.persisted_at !== null) ||
    !commercialValid ||
    !(
      value.error === null ||
      (record(value.error) &&
        typeof value.error.code === "string" &&
        typeof value.error.retryable === "boolean")
    ) ||
    (value.processing_state === "accepted" && confirmed) ||
    (value.processing_state === "processed" &&
      (!confirmed || value.error !== null))
  )
    return null;
  return value as unknown as CrmM2mReceipt;
}

export interface CrmM2mAttempt {
  readonly enabled: boolean;
  readonly endpoint: string;
  readonly approvedEndpoint: string;
  readonly keyId: string;
  readonly secret: Uint8Array;
  readonly sentAt: string;
  readonly clock: () => number;
  readonly transport?: (request: {
    url: string;
    body: string;
    headers: Readonly<Record<string, string>>;
    timeoutMs: 8000;
    redirect: "error";
  }) => Promise<{ status: number; body: unknown }>;
}
export type CrmM2mDeliveryResult = {
  readonly state:
    | "disabled"
    | "contact_confirmed"
    | "reconciliation_required"
    | "rejected";
  readonly transportAccepted: boolean;
  readonly receipt?: CrmM2mReceipt;
  readonly code?: string;
};

export const CrmM2mHttpsTransport: NonNullable<
  CrmM2mAttempt["transport"]
> = wire =>
  new Promise((resolve, reject) => {
    const request = httpsRequest(
      wire.url,
      {
        method: "POST",
        headers: {
          ...wire.headers,
          "Content-Length": Buffer.byteLength(wire.body, "utf8")
        }
      },
      response => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 32768) {
            request.destroy(new Error("M2M_RESPONSE_LIMIT"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          let body: unknown = null;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            body = null;
          }
          resolve({ status: response.statusCode || 0, body });
        });
      }
    );
    const deadline = setTimeout(
      () => request.destroy(new Error("M2M_TRANSPORT_TIMEOUT")),
      wire.timeoutMs
    );
    request.on("close", () => clearTimeout(deadline));
    request.on("error", reject);
    request.end(wire.body);
  });

export async function SendCrmM2mAttempt(
  envelope: CrmM2mEnvelope,
  attempt: CrmM2mAttempt,
  stableBody: string = JSON.stringify(envelope)
): Promise<CrmM2mDeliveryResult> {
  if (!attempt.enabled) return { state: "disabled", transportAccepted: false };
  const endpoint = new URL(attempt.endpoint);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    attempt.endpoint !== attempt.approvedEndpoint ||
    attempt.secret.byteLength < 32 ||
    !attempt.keyId.trim() ||
    !utc(attempt.sentAt) ||
    Math.abs(attempt.clock() - Date.parse(attempt.sentAt)) > 300000 ||
    Buffer.byteLength(stableBody, "utf8") > 32768 ||
    JSON.stringify(JSON.parse(stableBody)) !== JSON.stringify(envelope)
  ) {
    throw new Error("M2M_TRANSPORT_CONFIGURATION_REJECTED");
  }
  const signature = createHmac("sha256", attempt.secret)
    .update(`${attempt.sentAt}\n${envelope.event_id}\n${stableBody}`, "utf8")
    .digest("hex");
  let response: { status: number; body: unknown };
  try {
    response = await (attempt.transport || CrmM2mHttpsTransport)({
      url: attempt.endpoint,
      body: stableBody,
      timeoutMs: 8000,
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "X-SamaChat-Signature-Version": "1",
        "X-SamaChat-Key-Id": attempt.keyId,
        "X-SamaChat-Sent-At": attempt.sentAt,
        "X-SamaChat-Event-Id": envelope.event_id,
        "X-SamaChat-Signature": signature
      }
    });
  } catch {
    return {
      state: "reconciliation_required",
      transportAccepted: false,
      code: "transport_uncertain"
    };
  }
  const accepted = response.status >= 200 && response.status < 300;
  if (!accepted) {
    return {
      state: [400, 401, 403, 404, 415, 422].includes(response.status)
        ? "rejected"
        : "reconciliation_required",
      transportAccepted: false,
      code: `http_${response.status}`
    };
  }
  const receipt = ParseCrmM2mReceipt(response.body, envelope);
  if (!receipt)
    return {
      state: "reconciliation_required",
      transportAccepted: true,
      code: "invalid_receipt"
    };
  return {
    state:
      ["created", "reused", "enriched"].includes(
        receipt.contact_result.status
      ) &&
      ["not_requested", "created", "reused"].includes(
        receipt.commercial_result.status
      )
        ? "contact_confirmed"
        : "reconciliation_required",
    transportAccepted: true,
    receipt
  };
}

export function BuildCrmM2mReceiptQuery(
  envelope: CrmM2mEnvelope
): CrmM2mEnvelope {
  return {
    ...envelope,
    event_name: "samachat.crm.operation.receipt.requested",
    operation: "get_receipt"
  };
}
