import Contact from "../../models/Contact";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";

import {
  WhatsAppReconciliationCancellationSignal
} from "./WhatsAppReconciliationRuntime";

export interface WhatsAppReconciliationContactMetadata {
  name?: string | null;
  number?: string | null;
  lid?: string | null;
  profilePicUrl?: string | null;
  isGroup: boolean;
  profilePhotoProbe?: {
    rawIdSerialized?: string;
    rawIdUser?: string;
    rawIsGroup: boolean;
    hasRawGetProfilePicUrl: boolean;
    rawPhotoResult: "present" | "empty" | "error";
    mappedNumber: string;
    mappedLid?: string;
    mappedProfilePic: "present" | "empty";
  };
}

interface Request {
  whatsappId: number;
  metadata: WhatsAppReconciliationContactMetadata;
  signal: WhatsAppReconciliationCancellationSignal;
}

const normalizeWhatsappId = (whatsappId: number): number => {
  const normalized = Number(whatsappId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }

  return normalized;
};

const normalizeText = (
  value?: string | null
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
};

const normalizeLid = (
  value?: string | null
): string | undefined => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.includes("@")
    ? normalized
    : `${normalized}@lid`;
};

const ReconcileWhatsAppContactMetadataService = async ({
  whatsappId,
  metadata,
  signal
}: Request): Promise<Contact> => {
  const normalizedWhatsappId =
    normalizeWhatsappId(whatsappId);

  signal.throwIfAborted();

  const number = normalizeText(metadata.number);
  const lid = normalizeLid(metadata.lid);
  const incomingName = normalizeText(metadata.name);

  if (!number && !lid) {
    throw new Error(
      "ERR_WHATSAPP_RECONCILIATION_CONTACT_IDENTITY_REQUIRED"
    );
  }

  /*
   * Do not duplicate contact identity/name/photo rules here.
   *
   * CreateOrUpdateContactService remains the canonical layer for:
   * - equivalent phone-number candidates;
   * - number/LID reconciliation;
   * - preference for the contact backing the active ticket;
   * - ResolveContactName local/manual-name precedence;
   * - preservation/fallback of existing profile pictures.
   */
  const contact = await CreateOrUpdateContactService({
    name:
      incomingName ||
      number ||
      lid ||
      "",
    number,
    lid,
    profilePicUrl:
      normalizeText(metadata.profilePicUrl),
    isGroup: Boolean(metadata.isGroup),
    whatsappId: normalizedWhatsappId,
    profilePhotoProbe: metadata.profilePhotoProbe
  });

  signal.throwIfAborted();

  return contact;
};

export default ReconcileWhatsAppContactMetadataService;
