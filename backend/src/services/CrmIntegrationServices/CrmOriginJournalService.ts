import { createHash, randomUUID } from "crypto";
import {
  MessageProvenance,
  ResolveMessageProvenance
} from "../../providers/WhatsApp/MessageProvenance";
import AdaptCrmContactIntentService from "./AdaptCrmContactIntentService";
import {
  CrmContactIntentContext,
  CrmContactIntentInput,
  CrmContactSnapshot
} from "./BuildCrmContactIntentService";
import {
  BuildCrmM2mEnvelope,
  CrmM2mIdentity,
  CrmM2mReceipt,
  ParseCrmM2mReceipt
} from "./CrmM2mClient";

export type OriginContactFields = Omit<
  CrmContactSnapshot,
  "id" | "phoneE164"
> & {
  readonly email?: string;
  readonly profilePicUrl?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
};
export type OriginContactMutation =
  | { readonly kind: "create"; readonly data: OriginContactFields }
  | {
      readonly kind: "update";
      readonly contactId: number;
      readonly data: Partial<OriginContactFields>;
    };
export interface OriginCaptureRequest {
  readonly captureKey: string;
  readonly correlationId: string;
  readonly mutation: OriginContactMutation;
  readonly phoneE164: string | null;
  readonly bindingStatus: CrmContactIntentInput["bindingStatus"];
  readonly context: CrmContactIntentContext;
  readonly metadata?: { readonly messageProvenance?: MessageProvenance } | null;
}
export type OriginJournalState =
  | "intent_persisted"
  | "attempt_started"
  | "transport_accepted"
  | "receipt_validated"
  | "contact_confirmed"
  | "reconciliation_required"
  | "terminal_failure";
export interface OriginJournalEntry {
  readonly eventId: string;
  readonly correlationId: string;
  readonly sourceInstanceId: string;
  readonly integrationId: string;
  readonly organizationId: string;
  readonly sourceContactId: string;
  readonly sourceRevision: number;
  readonly operation: "upsert_contact";
  readonly schemaVersion: 1;
  readonly canonicalBody: string;
  readonly bodyHash: string;
  readonly semanticHash: string;
  readonly provenance: "realtime" | "manual";
  readonly provider: MessageProvenance["provider"];
  readonly occurredAt: string;
  state: OriginJournalState;
  stateVersion: number;
  attemptCount: number;
  attemptId: string | null;
  leaseExpiresAt: string | null;
  transportAcceptedAt: string | null;
  receiptValidatedAt: string | null;
  contactConfirmedAt: string | null;
  receipt: CrmM2mReceipt | null;
  lastErrorCode: string | null;
  readonly commercialOperation: "not_requested";
}
export interface OriginCaptureOutcome {
  readonly source: "committed";
  readonly contactId: number;
  readonly intent: "persisted" | "existing" | "no_action" | "pending_identity";
  readonly eventId: string | null;
  readonly reason: string;
}
export interface OriginJournalUnitOfWork {
  lockCommand(
    request: OriginCaptureRequest,
    identity: CrmM2mIdentity,
    inputHash: string
  ): Promise<OriginCaptureOutcome | null>;
  mutateContact(
    mutation: OriginContactMutation
  ): Promise<{ before: CrmContactSnapshot | null; after: CrmContactSnapshot }>;
  latest(
    sourceInstanceId: string,
    sourceContactId: string
  ): Promise<OriginJournalEntry | null>;
  insert(entry: OriginJournalEntry): Promise<void>;
  completeCommand(
    captureKey: string,
    outcome: OriginCaptureOutcome
  ): Promise<void>;
}
export interface OriginJournalRepository {
  transaction<Result>(
    work: (unit: OriginJournalUnitOfWork) => Promise<Result>
  ): Promise<Result>;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const OriginJournalHash = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");
const stableInput = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableInput);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, stableInput(item)])
    );
  return value;
};
export function ValidateOriginJournalIdentity(identity: CrmM2mIdentity): void {
  if (
    !identity ||
    !uuid.test(identity.organizationId) ||
    ![identity.integrationId, identity.sourceInstanceId].every(
      value =>
        typeof value === "string" &&
        value.trim() === value &&
        value.length > 0 &&
        value.length <= 100
    )
  )
    throw new Error("ORIGIN_IDENTITY_INVALID");
}
export function VerifyOriginJournalEntry(entry: OriginJournalEntry): void {
  if (OriginJournalHash(entry.canonicalBody) !== entry.bodyHash)
    throw new Error("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
  let envelope;
  try {
    envelope = JSON.parse(entry.canonicalBody);
  } catch {
    throw new Error("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
  }
  if (
    !envelope ||
    envelope.event_id !== entry.eventId ||
    envelope.correlation_id !== entry.correlationId ||
    envelope.source_contact_id !== entry.sourceContactId ||
    envelope.source_instance_id !== entry.sourceInstanceId ||
    envelope.integration_id !== entry.integrationId ||
    envelope.organization_id !== entry.organizationId ||
    envelope.source_revision !== entry.sourceRevision ||
    envelope.operation !== "upsert_contact" ||
    envelope.schema_version !== 1 ||
    entry.operation !== "upsert_contact" ||
    entry.commercialOperation !== "not_requested" ||
    OriginJournalHash(JSON.stringify(stableInput(envelope.data))) !==
      entry.semanticHash
  )
    throw new Error("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
}
export function ValidateOriginJournalReceipt(
  value: unknown,
  entry: OriginJournalEntry
): CrmM2mReceipt {
  VerifyOriginJournalEntry(entry);
  const parsed = ParseCrmM2mReceipt(value, JSON.parse(entry.canonicalBody));
  if (
    !parsed ||
    (parsed.error && !/^[a-z][a-z0-9_]{0,99}$/.test(parsed.error.code))
  )
    throw new Error("ORIGIN_RECEIPT_INVALID");
  return {
    schema_version: parsed.schema_version,
    event_id: parsed.event_id,
    organization_id: parsed.organization_id,
    correlation_id: parsed.correlation_id,
    receipt_id: parsed.receipt_id,
    processing_state: parsed.processing_state,
    contact_result: {
      status: parsed.contact_result.status,
      crm_contact_id: parsed.contact_result.crm_contact_id,
      persisted_at: parsed.contact_result.persisted_at
    },
    commercial_result: {
      status: "not_requested",
      primary_deal_id: null,
      opportunity_id: null
    },
    error: parsed.error
      ? { code: parsed.error.code, retryable: parsed.error.retryable }
      : null
  };
}

export default class CrmOriginJournalService {
  constructor(
    private readonly repository: OriginJournalRepository,
    private readonly configuration: {
      readonly enabled: boolean;
      readonly identity: CrmM2mIdentity;
    },
    private readonly clock: () => Date = () => new Date(),
    private readonly eventId: () => string = randomUUID
  ) {
    ValidateOriginJournalIdentity(configuration.identity);
  }

  async capture(
    request: OriginCaptureRequest
  ): Promise<
    OriginCaptureOutcome | { source: "not_mutated"; intent: "disabled" }
  > {
    if (this.configuration.enabled !== true)
      return { source: "not_mutated", intent: "disabled" };
    if (
      !request ||
      !uuid.test(request.captureKey) ||
      !uuid.test(request.correlationId) ||
      !["create", "update"].includes(request.mutation?.kind)
    )
      throw new Error("ORIGIN_CAPTURE_REQUEST_INVALID");
    const identity = this.configuration.identity;
    const inputHash = OriginJournalHash(
      JSON.stringify(stableInput({ identity, request }))
    );
    return this.repository.transaction(async unit => {
      const replay = await unit.lockCommand(request, identity, inputHash);
      if (replay) return replay;
      const { before, after } = await unit.mutateContact(request.mutation);
      if (
        !Number.isSafeInteger(after.id) ||
        after.id < 1 ||
        (before && before.id !== after.id)
      )
        throw new Error("ORIGIN_CONTACT_IDENTITY_CONFLICT");
      const decision = AdaptCrmContactIntentService(
        {
          contact: { ...after, phoneE164: request.phoneE164 },
          previousContact: before
            ? { ...before, phoneE164: request.phoneE164 }
            : null,
          resolution: before ? "reused" : "created",
          bindingStatus: request.bindingStatus,
          context: request.context
        },
        request.metadata
      );
      let outcome: OriginCaptureOutcome;
      if (decision.status !== "candidate") {
        outcome = {
          source: "committed",
          contactId: after.id,
          intent: decision.status,
          eventId: null,
          reason: decision.reason
        };
      } else {
        const previous = await unit.latest(
          identity.sourceInstanceId,
          String(after.id)
        );
        if (previous) {
          VerifyOriginJournalEntry(previous);
          if (
            previous.integrationId !== identity.integrationId ||
            previous.organizationId !== identity.organizationId
          )
            throw new Error("ORIGIN_TARGET_IDENTITY_CONFLICT");
        }
        const semanticHash = OriginJournalHash(
          JSON.stringify(
            stableInput({
              phone_e164: decision.candidate.data.phone_e164,
              display_name: decision.candidate.data.display_name,
              capture_channel: decision.candidate.data.capture_channel,
              registration: {
                complete: decision.candidate.data.registration.complete,
                missing_fields:
                  decision.candidate.data.registration.missingFields
              }
            })
          )
        );
        if (previous?.semanticHash === semanticHash) {
          outcome = {
            source: "committed",
            contactId: after.id,
            intent: "existing",
            eventId: previous.eventId,
            reason: "semantic_intent_already_persisted"
          };
        } else {
          const sourceRevision = (previous?.sourceRevision || 0) + 1;
          if (!Number.isSafeInteger(sourceRevision))
            throw new Error("ORIGIN_REVISION_EXHAUSTED");
          const occurredAt = this.clock().toISOString();
          const envelope = BuildCrmM2mEnvelope(
            decision,
            identity,
            {
              id: this.eventId(),
              correlationId: request.correlationId,
              occurredAt,
              revision: sourceRevision
            },
            {
              channel: request.context.channel as "whatsapp_inbound" | "manual",
              provenance:
                request.context.channel === "manual" ? "manual" : "realtime",
              from_me: false,
              is_group: false
            }
          );
          if (
            !envelope ||
            (envelope.data.display_name?.length || 0) > 200 ||
            (envelope.data.capture_channel?.length || 0) > 100
          )
            throw new Error("ORIGIN_ENVELOPE_INVALID");
          const canonicalBody = JSON.stringify(envelope);
          if (Buffer.byteLength(canonicalBody, "utf8") > 32768)
            throw new Error("ORIGIN_ENVELOPE_LIMIT");
          const entry: OriginJournalEntry = {
            eventId: envelope.event_id,
            correlationId: request.correlationId,
            sourceInstanceId: identity.sourceInstanceId,
            integrationId: identity.integrationId,
            organizationId: identity.organizationId,
            sourceContactId: String(after.id),
            sourceRevision,
            operation: "upsert_contact",
            schemaVersion: 1,
            canonicalBody,
            bodyHash: OriginJournalHash(canonicalBody),
            semanticHash,
            provenance: envelope.context.provenance,
            provider: ResolveMessageProvenance(request.metadata).provider,
            occurredAt,
            state: "intent_persisted",
            stateVersion: 0,
            attemptCount: 0,
            attemptId: null,
            leaseExpiresAt: null,
            transportAcceptedAt: null,
            receiptValidatedAt: null,
            contactConfirmedAt: null,
            receipt: null,
            lastErrorCode: null,
            commercialOperation: "not_requested"
          };
          VerifyOriginJournalEntry(entry);
          await unit.insert(entry);
          outcome = {
            source: "committed",
            contactId: after.id,
            intent: "persisted",
            eventId: entry.eventId,
            reason: decision.reason
          };
        }
      }
      await unit.completeCommand(request.captureKey, outcome);
      return outcome;
    });
  }
}
