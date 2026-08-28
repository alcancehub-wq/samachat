import type {
  WhatsAppReconciliationContactWorkItem,
  WhatsAppReconciliationWork
} from "../../../services/WhatsappService/RunWhatsAppReconciliationService";

const normalize = (
  value?: string | null
): string =>
  typeof value === "string"
    ? value.trim()
    : "";

const normalizeLid = (
  value?: string | null
): string | undefined => {
  const normalized = normalize(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.includes("@")
    ? normalized
    : `${normalized}@lid`;
};

const BuildWWebJsTargetRecoveryContact = ({
  number,
  storedLid,
  providerAliases,
  profilePicUrl
}: {
  number?: string | null;
  storedLid?: string | null;
  providerAliases: string[];
  profilePicUrl?: string | null;
}): WhatsAppReconciliationContactWorkItem | null => {
  const normalizedAliases =
    providerAliases
      .map(normalize)
      .filter(Boolean);

  const normalizedProfilePicUrl =
    normalize(profilePicUrl);

  /*
   * Synthetic metadata is emitted only when the provider
   * actually supplied evidence during this targeted run.
   * Stored DB identity by itself must not manufacture a
   * successful provider reconciliation.
   */
  if (
    normalizedAliases.length === 0 &&
    !normalizedProfilePicUrl
  ) {
    return null;
  }

  const resolvedLid =
    normalizeLid(storedLid) ||
    normalizedAliases
      .map(alias =>
        alias.endsWith("@lid")
          ? normalizeLid(alias)
          : undefined
      )
      .find(Boolean);

  const normalizedNumber =
    normalize(number);

  if (
    !normalizedNumber &&
    !resolvedLid
  ) {
    return null;
  }

  return {
    metadata: {
      name:
        normalizedNumber ||
        resolvedLid ||
        "",
      number:
        normalizedNumber,
      lid:
        resolvedLid,
      profilePicUrl:
        normalizedProfilePicUrl ||
        undefined,
      isGroup: false
    }
  };
};

export const HasWWebJsTargetRecoveryEvidence = (
  work: WhatsAppReconciliationWork
): boolean =>
  Boolean(
    (work.messages || []).length > 0 ||
    (work.contacts || []).length > 0
  );

export default BuildWWebJsTargetRecoveryContact;
