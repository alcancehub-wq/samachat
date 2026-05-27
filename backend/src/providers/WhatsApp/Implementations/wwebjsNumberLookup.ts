import NormalizeValidatedContactNumber from "../../../helpers/NormalizeValidatedContactNumber";
import type { ProviderContactLookupResult } from "../whatsappProvider";

interface WhatsAppLookupResult {
  user?: string | null;
  server?: string | null;
  _serialized?: string | null;
}

type LookupCandidate = (
  candidate: string
) => Promise<WhatsAppLookupResult | null | undefined>;

const normalizeDigits = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.replace(/\D/g, "");
};

const normalizeLid = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.includes("@") ? value : `${value}@lid`;
};

const resolveContactLookup = (
  candidate: string,
  validNumber?: WhatsAppLookupResult | null
): ProviderContactLookupResult | null => {
  const normalizedNumber = NormalizeValidatedContactNumber(candidate, validNumber);

  if (!normalizedNumber) {
    return null;
  }

  const serializedId = validNumber?._serialized || undefined;
  const lidIdentifier =
    validNumber?.server === "lid" || /@lid$/i.test(serializedId || "")
      ? normalizeLid(validNumber?.user || serializedId?.split("@")[0])
      : undefined;
  const chatId = lidIdentifier || `${normalizedNumber}@c.us`;

  return {
    number: normalizedNumber,
    chatId,
    jid: chatId,
    lid: lidIdentifier,
    serializedId: serializedId || chatId
  };
};

export const resolveContactLookupFromCandidates = async (
  candidates: string[],
  lookupCandidate: LookupCandidate
): Promise<ProviderContactLookupResult> => {
  let lastLookupError: unknown;

  for (const candidate of candidates) {
    try {
      const validNumber = await lookupCandidate(candidate);
      const resolvedLookup = resolveContactLookup(candidate, validNumber);

      if (resolvedLookup) {
        return resolvedLookup;
      }
    } catch (err) {
      lastLookupError = err;
    }
  }

  if (lastLookupError) {
    throw lastLookupError;
  }

  return {
    number: ""
  };
};

export const resolveValidatedNumberFromCandidates = async (
  candidates: string[],
  lookupCandidate: LookupCandidate
): Promise<string> => {
  const resolvedLookup = await resolveContactLookupFromCandidates(
    candidates,
    lookupCandidate
  );

  return normalizeDigits(resolvedLookup.number);
};