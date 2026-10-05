import IsPlausiblePhoneNumber from "../../helpers/IsPlausiblePhoneNumber";
import EvaluateContactRegistrationCompletenessService, {
  ContactRegistrationCompleteness,
  ContactRegistrationData
} from "../ContactServices/EvaluateContactRegistrationCompletenessService";

export interface CrmContactSnapshot extends ContactRegistrationData {
  readonly id: number;
  readonly isGroup: boolean;
  readonly lid?: string | null;
  readonly phoneE164?: string | null;
}

export interface CrmContactIntentContext {
  readonly channel:
    | "whatsapp_inbound"
    | "manual"
    | "api_outbound"
    | "reconciliation"
    | "unknown";
  readonly provenance:
    | "realtime"
    | "manual"
    | "echo"
    | "history"
    | "ack"
    | "unknown";
  readonly fromMe: boolean;
  readonly isGroup: boolean;
  readonly authorized: boolean;
}

export interface CrmContactIntentInput {
  readonly contact: Readonly<CrmContactSnapshot>;
  readonly previousContact?: Readonly<CrmContactSnapshot> | null;
  readonly resolution: "created" | "reused" | "enriched";
  readonly bindingStatus: "linked" | "not_linked" | "unknown";
  readonly context: Readonly<CrmContactIntentContext>;
}

interface CrmIntentRestrictions {
  readonly transport: "not_released";
  readonly commercialOperation: "not_requested";
  readonly m2mContract: "PENDENTE_DE_VALIDACAO_CRM";
}

export interface CrmContactSemanticData {
  readonly phone_e164: string | null;
  readonly display_name: string | null;
  readonly capture_channel: string | null;
  readonly registration: ContactRegistrationCompleteness;
}

export interface CrmContactIntentCandidate {
  readonly operation: "upsert_contact";
  readonly source_contact_id: string;
  readonly change: "created" | "reused" | "enriched";
  readonly data: CrmContactSemanticData & { readonly phone_e164: string };
}

export type CrmContactNoActionReason =
  | "invalid_contact"
  | "invalid_context"
  | "invalid_resolution"
  | "invalid_previous_contact"
  | "contradictory_resolution"
  | "group"
  | "outbound"
  | "echo"
  | "history"
  | "ack"
  | "unknown_provenance"
  | "manual_not_authorized"
  | "sync_not_authorized"
  | "change_unverified"
  | "no_semantic_change";

export type CrmContactIntentDecision = CrmIntentRestrictions &
  (
    | {
        readonly status: "candidate";
        readonly reason:
          | "contact_created"
          | "initial_sync_required"
          | "semantic_enrichment";
        readonly candidate: CrmContactIntentCandidate;
      }
    | {
        readonly status: "no_action";
        readonly reason: CrmContactNoActionReason;
      }
    | {
        readonly status: "pending_identity";
        readonly reason:
          | "lid_without_resolved_phone"
          | "phone_not_resolved"
          | "phone_not_confirmed";
        readonly source_contact_id: string;
      }
  );

const normalizeText = (value?: string | null): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const isOptionalText = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string";

const isValidSnapshot = (value: unknown): value is CrmContactSnapshot => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as CrmContactSnapshot;

  return (
    Number.isSafeInteger(snapshot.id) &&
    snapshot.id > 0 &&
    typeof snapshot.isGroup === "boolean" &&
    [
      snapshot.name,
      snapshot.number,
      snapshot.lid,
      snapshot.phoneE164,
      snapshot.captureChannel,
      snapshot.referralType,
      snapshot.referralContactName,
      snapshot.referralPartnerName
    ].every(isOptionalText) &&
    (snapshot.wasReferred === undefined ||
      snapshot.wasReferred === null ||
      typeof snapshot.wasReferred === "boolean") &&
    [snapshot.referralContactId, snapshot.referralUserId].every(
      value =>
        value === undefined ||
        value === null ||
        (Number.isSafeInteger(value) && Number(value) >= 0)
    )
  );
};

const resolveConfirmedPhone = (
  contact: Readonly<CrmContactSnapshot>
): string | null => {
  const phone = normalizeText(contact.phoneE164);
  const number = normalizeText(contact.number);

  if (
    !phone ||
    !/^\+[1-9]\d{7,14}$/.test(phone) ||
    !IsPlausiblePhoneNumber(phone) ||
    !number ||
    !/^\+?[1-9]\d{7,14}$/.test(number) ||
    number.replace(/^\+/, "") !== phone.slice(1)
  ) {
    return null;
  }

  return phone;
};

const buildSemanticData = (
  contact: Readonly<CrmContactSnapshot>,
  phone: string | null
): CrmContactSemanticData => ({
  phone_e164: phone,
  display_name: normalizeText(contact.name),
  capture_channel: normalizeText(contact.captureChannel),
  registration: EvaluateContactRegistrationCompletenessService(contact)
});

const BuildCrmContactIntentService = (
  input: CrmContactIntentInput
): CrmContactIntentDecision => {
  const restrictions: CrmIntentRestrictions = {
    transport: "not_released",
    commercialOperation: "not_requested",
    m2mContract: "PENDENTE_DE_VALIDACAO_CRM"
  };
  const noAction = (
    reason: CrmContactNoActionReason
  ): CrmContactIntentDecision => ({
    ...restrictions,
    status: "no_action",
    reason
  });

  if (!input || !isValidSnapshot(input.contact)) {
    return noAction("invalid_contact");
  }

  const { contact, context, previousContact, resolution, bindingStatus } =
    input;

  if (
    !context ||
    typeof context !== "object" ||
    typeof context.fromMe !== "boolean" ||
    typeof context.isGroup !== "boolean" ||
    typeof context.authorized !== "boolean"
  ) {
    return noAction("invalid_context");
  }

  if (contact.isGroup || context.isGroup) return noAction("group");
  if (context.fromMe || context.channel === "api_outbound")
    return noAction("outbound");
  if (context.provenance === "echo") return noAction("echo");
  if (context.provenance === "history") return noAction("history");
  if (context.provenance === "ack") return noAction("ack");

  const isManual =
    context.channel === "manual" && context.provenance === "manual";
  const isInbound =
    context.channel === "whatsapp_inbound" && context.provenance === "realtime";

  if (!isManual && !isInbound) return noAction("unknown_provenance");
  if (!context.authorized) {
    return noAction(isManual ? "manual_not_authorized" : "sync_not_authorized");
  }
  if (
    !["created", "reused", "enriched"].includes(resolution) ||
    !["linked", "not_linked", "unknown"].includes(bindingStatus)
  ) {
    return noAction("invalid_resolution");
  }
  if (
    previousContact !== undefined &&
    previousContact !== null &&
    (!isValidSnapshot(previousContact) ||
      previousContact.id !== contact.id ||
      previousContact.isGroup)
  ) {
    return noAction("invalid_previous_contact");
  }
  if (resolution === "created" && previousContact)
    return noAction("contradictory_resolution");

  const phone = resolveConfirmedPhone(contact);

  if (!phone) {
    return {
      ...restrictions,
      status: "pending_identity",
      reason: normalizeText(contact.phoneE164)
        ? "phone_not_confirmed"
        : normalizeText(contact.lid)
        ? "lid_without_resolved_phone"
        : "phone_not_resolved",
      source_contact_id: String(contact.id)
    };
  }

  const data = { ...buildSemanticData(contact, phone), phone_e164: phone };
  const candidate = (
    change: CrmContactIntentCandidate["change"],
    reason: "contact_created" | "initial_sync_required" | "semantic_enrichment"
  ): CrmContactIntentDecision => ({
    ...restrictions,
    status: "candidate",
    reason,
    candidate: {
      operation: "upsert_contact",
      source_contact_id: String(contact.id),
      change,
      data
    }
  });

  if (resolution === "created") return candidate("created", "contact_created");
  if (
    previousContact &&
    JSON.stringify(data) !==
      JSON.stringify(
        buildSemanticData(
          previousContact,
          resolveConfirmedPhone(previousContact)
        )
      )
  ) {
    return candidate("enriched", "semantic_enrichment");
  }
  if (resolution === "enriched" && !previousContact)
    return noAction("change_unverified");
  if (bindingStatus === "not_linked")
    return candidate("reused", "initial_sync_required");

  return noAction("no_semantic_change");
};

export default BuildCrmContactIntentService;
