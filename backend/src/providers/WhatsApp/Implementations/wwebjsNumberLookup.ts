import NormalizeValidatedContactNumber from "../../../helpers/NormalizeValidatedContactNumber";

interface WhatsAppLookupResult {
  user?: string | null;
  server?: string | null;
  _serialized?: string | null;
}

type LookupCandidate = (
  candidate: string
) => Promise<WhatsAppLookupResult | null | undefined>;

export const resolveValidatedNumberFromCandidates = async (
  candidates: string[],
  lookupCandidate: LookupCandidate
): Promise<string> => {
  let lastLookupError: unknown;

  for (const candidate of candidates) {
    try {
      const validNumber = await lookupCandidate(candidate);
      const normalizedNumber = NormalizeValidatedContactNumber(
        candidate,
        validNumber
      );

      if (normalizedNumber) {
        return normalizedNumber;
      }
    } catch (err) {
      lastLookupError = err;
    }
  }

  if (lastLookupError) {
    throw lastLookupError;
  }

  return "";
};