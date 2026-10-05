import { randomUUID } from "crypto";
import {
  BuildCrmM2mReceiptQuery,
  CrmM2mAttempt,
  CrmM2mEnvelope,
  CrmM2mIdentity,
  SendCrmM2mAttempt
} from "./CrmM2mClient";
import {
  OriginJournalEntry,
  ValidateOriginJournalIdentity,
  VerifyOriginJournalEntry
} from "./CrmOriginJournalService";
import { OriginJournalTransition } from "./SequelizeCrmOriginJournalRepository";

export interface DeliveryCoordinatorRepository {
  deliveryCandidate(
    identity: CrmM2mIdentity,
    now: Date,
    maxOperations: number
  ): Promise<OriginJournalEntry | null>;
  read(
    identity: CrmM2mIdentity,
    eventId: string
  ): Promise<OriginJournalEntry | null>;
  transition(
    identity: CrmM2mIdentity,
    eventId: string,
    version: number,
    change: OriginJournalTransition,
    now: Date
  ): Promise<OriginJournalEntry>;
  recoverExpired(
    identity: CrmM2mIdentity,
    now: Date,
    eventId?: string
  ): Promise<number>;
  rejectInvalidCandidate?(
    identity: CrmM2mIdentity,
    entry: OriginJournalEntry,
    now: Date
  ): Promise<boolean>;
}
export interface DeliveryCoordinatorConfiguration {
  readonly enabled?: boolean;
  readonly identity?: CrmM2mIdentity;
  readonly m2m?: Pick<
    CrmM2mAttempt,
    "endpoint" | "approvedEndpoint" | "keyId" | "secret"
  >;
  readonly transport?: NonNullable<CrmM2mAttempt["transport"]>;
  readonly policy?: {
    readonly leaseMs?: number;
    readonly backoffMs?: number;
    readonly maxOperations?: number;
  };
}
export interface DeliveryCoordinatorResult {
  readonly state:
    | "disabled"
    | "idle"
    | "busy"
    | "contact_confirmed"
    | "receipt_validated"
    | "reconciliation_required"
    | "terminal_failure"
    | "rejected";
  readonly operation?: "upsert_contact" | "get_receipt";
  readonly eventId?: string;
  readonly code?: string;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const utc = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every(key => keys.includes(key));
const nullableText = (value: unknown, maximum: number) =>
  value === null ||
  (typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum);

export function ValidateCrmDeliveryConfiguration(
  identity: CrmM2mIdentity,
  configuration: DeliveryCoordinatorConfiguration
): { leaseMs: number; backoffMs: number; maxOperations: number } {
  ValidateOriginJournalIdentity(identity);
  ValidateOriginJournalIdentity(configuration.identity!);
  if (
    identity.organizationId !== configuration.identity!.organizationId ||
    identity.integrationId !== configuration.identity!.integrationId ||
    identity.sourceInstanceId !== configuration.identity!.sourceInstanceId
  )
    throw new Error("DELIVERY_SCOPE_INVALID");
  const m2m = configuration.m2m;
  if (
    !m2m ||
    typeof configuration.transport !== "function" ||
    !(Buffer.isBuffer(m2m.secret) || m2m.secret instanceof Uint8Array) ||
    m2m.secret.byteLength < 32 ||
    !/^[A-Za-z0-9._:-]{1,100}$/.test(m2m.keyId)
  )
    throw new Error("DELIVERY_CONFIGURATION_INVALID");
  const endpoint = new URL(m2m.endpoint);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    m2m.endpoint !== m2m.approvedEndpoint
  )
    throw new Error("DELIVERY_CONFIGURATION_INVALID");
  const leaseMs = configuration.policy?.leaseMs ?? 30000;
  const backoffMs = configuration.policy?.backoffMs ?? 60000;
  const maxOperations = configuration.policy?.maxOperations ?? 5;
  if (
    !Number.isSafeInteger(leaseMs) ||
    leaseMs < 15000 ||
    leaseMs > 300000 ||
    !Number.isSafeInteger(backoffMs) ||
    backoffMs < 30000 ||
    backoffMs > 3600000 ||
    !Number.isSafeInteger(maxOperations) ||
    maxOperations < 1 ||
    maxOperations > 10
  )
    throw new Error("DELIVERY_POLICY_INVALID");
  return { leaseMs, backoffMs, maxOperations };
}

export function VerifyDeliveryEnvelope(
  entry: OriginJournalEntry,
  identity: CrmM2mIdentity
): CrmM2mEnvelope {
  VerifyOriginJournalEntry(entry);
  const body: unknown = JSON.parse(entry.canonicalBody);
  if (
    !record(body) ||
    !record(body.context) ||
    !record(body.data) ||
    !record(body.data.registration)
  )
    throw new Error("DELIVERY_ENVELOPE_INVALID");
  const context = body.context;
  const data = body.data;
  const registration = data.registration;
  if (!record(registration)) throw new Error("DELIVERY_ENVELOPE_INVALID");
  if (
    !exactKeys(body, [
      "schema_version",
      "event_id",
      "event_name",
      "occurred_at",
      "correlation_id",
      "source_system",
      "source_instance_id",
      "integration_id",
      "organization_id",
      "operation",
      "source_contact_id",
      "source_revision",
      "context",
      "data"
    ]) ||
    !exactKeys(context, [
      "channel",
      "provenance",
      "from_me",
      "is_group",
      "whatsapp_connection_id"
    ]) ||
    !exactKeys(data, [
      "phone_e164",
      "display_name",
      "capture_channel",
      "registration"
    ]) ||
    !exactKeys(registration, ["complete", "missing_fields"]) ||
    body.schema_version !== 1 ||
    body.event_name !== "samachat.crm.contact.upsert.requested" ||
    body.source_system !== "samachat" ||
    body.operation !== "upsert_contact" ||
    entry.schemaVersion !== 1 ||
    !uuid.test(entry.eventId) ||
    !uuid.test(entry.correlationId) ||
    body.organization_id !== identity.organizationId ||
    body.integration_id !== identity.integrationId ||
    body.source_instance_id !== identity.sourceInstanceId ||
    !/^[1-9]\d*$/.test(entry.sourceContactId) ||
    !Number.isSafeInteger(Number(entry.sourceContactId)) ||
    !Number.isSafeInteger(entry.sourceRevision) ||
    entry.sourceRevision < 1 ||
    !utc(body.occurred_at) ||
    body.occurred_at !== entry.occurredAt ||
    context.from_me !== false ||
    context.is_group !== false ||
    context.provenance !== entry.provenance ||
    !(
      (context.channel === "manual" && context.provenance === "manual") ||
      (context.channel === "whatsapp_inbound" &&
        context.provenance === "realtime" &&
        entry.provider !== "unknown")
    ) ||
    !["unknown", "wwebjs", "whaileys", "cloud_api"].includes(entry.provider) ||
    (context.whatsapp_connection_id !== undefined &&
      (typeof context.whatsapp_connection_id !== "string" ||
        context.whatsapp_connection_id.length < 1 ||
        context.whatsapp_connection_id.length > 100)) ||
    typeof data.phone_e164 !== "string" ||
    !/^\+[1-9]\d{7,14}$/.test(data.phone_e164) ||
    !nullableText(data.display_name, 200) ||
    !nullableText(data.capture_channel, 100) ||
    typeof registration.complete !== "boolean" ||
    !Array.isArray(registration.missing_fields) ||
    registration.missing_fields.length > 20 ||
    !registration.missing_fields.every(
      (field: unknown) =>
        typeof field === "string" && field.length > 0 && field.length <= 100
    ) ||
    !Number.isSafeInteger(entry.stateVersion) ||
    entry.stateVersion < 0 ||
    !Number.isSafeInteger(entry.attemptCount) ||
    entry.attemptCount < 0 ||
    Buffer.byteLength(entry.canonicalBody, "utf8") > 32768
  )
    throw new Error("DELIVERY_ENVELOPE_INVALID");
  return body as unknown as CrmM2mEnvelope;
}

export default class CrmDeliveryCoordinator {
  constructor(
    private readonly repository: DeliveryCoordinatorRepository,
    private readonly configuration: DeliveryCoordinatorConfiguration = {},
    private readonly clock: () => Date = () => new Date(),
    private readonly attemptId: () => string = randomUUID
  ) {}

  async runOnce(
    identity: CrmM2mIdentity,
    options: { readonly eventId?: string } = {}
  ): Promise<DeliveryCoordinatorResult> {
    if (this.configuration.enabled !== true) return { state: "disabled" };
    let candidate: OriginJournalEntry | null = null;
    let operationSent = false;
    try {
      const configuration = this.configuration;
      const { leaseMs, backoffMs, maxOperations } =
        ValidateCrmDeliveryConfiguration(identity, configuration);
      const m2m = configuration.m2m!;
      const transport = configuration.transport!;
      const now = this.clock();
      if (!Number.isFinite(+now)) throw new Error("DELIVERY_CLOCK_INVALID");
      candidate = await this.repository.deliveryCandidate(
        identity,
        now,
        maxOperations
      );
      if (
        !candidate ||
        (options.eventId && options.eventId !== candidate.eventId)
      )
        return { state: "idle" };
      const envelope = VerifyDeliveryEnvelope(candidate, identity);
      if (["attempt_started", "transport_accepted"].includes(candidate.state)) {
        await this.repository.recoverExpired(identity, now, candidate.eventId);
        candidate = await this.repository.read(identity, candidate.eventId);
        if (!candidate || candidate.state === "contact_confirmed")
          return { state: candidate ? "contact_confirmed" : "idle" };
      }
      if (candidate.attemptCount >= maxOperations)
        return {
          state: "reconciliation_required",
          eventId: candidate.eventId,
          code: "execution_budget_exhausted"
        };
      const operation =
        candidate.state === "intent_persisted" && candidate.attemptCount === 0
          ? "upsert_contact"
          : "get_receipt";
      const claim = await this.repository.transition(
        identity,
        candidate.eventId,
        candidate.stateVersion,
        {
          kind: "begin_attempt",
          attemptId: this.attemptId(),
          leaseExpiresAt: new Date(+now + leaseMs).toISOString()
        },
        now
      );
      let current = claim;
      const requestEnvelope =
        operation === "get_receipt"
          ? BuildCrmM2mReceiptQuery(envelope)
          : envelope;
      operationSent = true;
      const result = await SendCrmM2mAttempt(
        requestEnvelope,
        {
          enabled: true,
          ...m2m,
          transport,
          sentAt: this.clock().toISOString(),
          clock: () => +this.clock()
        },
        operation === "upsert_contact"
          ? claim.canonicalBody
          : JSON.stringify(requestEnvelope)
      );
      const after = this.clock();
      const notBefore = new Date(+after + backoffMs).toISOString();
      if (result.transportAccepted)
        current = await this.repository.transition(
          identity,
          current.eventId,
          current.stateVersion,
          { kind: "transport_accepted", attemptId: claim.attemptId! },
          after
        );
      if (result.receipt) {
        current = await this.repository.transition(
          identity,
          current.eventId,
          current.stateVersion,
          {
            kind: "receipt",
            value: result.receipt,
            attemptId: claim.attemptId!,
            notBefore
          },
          after
        );
        return {
          state:
            current.state === "contact_confirmed"
              ? "contact_confirmed"
              : current.state === "receipt_validated"
              ? "receipt_validated"
              : "reconciliation_required",
          operation,
          eventId: current.eventId
        };
      }
      if (operation === "upsert_contact" && result.state === "rejected") {
        current = await this.repository.transition(
          identity,
          current.eventId,
          current.stateVersion,
          {
            kind: "terminal_failure",
            code: result.code || "upsert_rejected",
            attemptId: claim.attemptId!
          },
          after
        );
        return {
          state: "terminal_failure",
          operation,
          eventId: current.eventId,
          code: result.code
        };
      }
      current = await this.repository.transition(
        identity,
        current.eventId,
        current.stateVersion,
        {
          kind: "uncertain",
          attemptId: claim.attemptId!,
          code:
            operation === "get_receipt" && result.code === "http_404"
              ? "receipt_not_found_inconclusive"
              : result.code || "transport_uncertain",
          notBefore
        },
        after
      );
      return {
        state: "reconciliation_required",
        operation,
        eventId: current.eventId,
        code: current.lastErrorCode || undefined
      };
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "delivery_unavailable";
      if (
        candidate &&
        [
          "ORIGIN_STATE_VERSION_CONFLICT",
          "ORIGIN_ATTEMPT_ID_CONFLICT",
          "ORIGIN_STATE_TERMINAL",
          "ORIGIN_ATTEMPT_INVALID",
          "ORIGIN_EVENT_ORDER_BLOCKED"
        ].includes(code)
      ) {
        const current = await this.repository
          .read(identity, candidate.eventId)
          .catch(() => null);
        return {
          state:
            current?.state === "contact_confirmed"
              ? "contact_confirmed"
              : "busy",
          eventId: candidate.eventId,
          code: "concurrent_state_changed"
        };
      }
      if (operationSent)
        return {
          state: "reconciliation_required",
          eventId: candidate?.eventId,
          code: "state_write_uncertain"
        };
      if (
        candidate &&
        [
          "DELIVERY_ENVELOPE_INVALID",
          "ORIGIN_JOURNAL_INTEGRITY_CONFLICT"
        ].includes(code)
      )
        await this.repository
          .rejectInvalidCandidate?.(identity, candidate, this.clock())
          .catch(() => false);
      return {
        state: "rejected",
        eventId: candidate?.eventId,
        code: [
          "DELIVERY_SCOPE_INVALID",
          "DELIVERY_CONFIGURATION_INVALID",
          "DELIVERY_POLICY_INVALID",
          "DELIVERY_CLOCK_INVALID",
          "ORIGIN_IDENTITY_INVALID",
          "DELIVERY_ENVELOPE_INVALID",
          "ORIGIN_JOURNAL_INTEGRITY_CONFLICT"
        ].includes(code)
          ? code.toLowerCase()
          : "delivery_unavailable"
      };
    }
  }
}
