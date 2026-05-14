const normalizeName = (value?: string | null): string => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeDigits = (value?: string | null): string => {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
};

const normalizeBareLid = (value?: string | null): string => {
  return typeof value === "string"
    ? value.replace(/@lid$/i, "").trim().toLowerCase()
    : "";
};

const isMeaningfulName = (
  candidate?: string | null,
  number?: string | null,
  lid?: string | null
): boolean => {
  const normalizedCandidate = normalizeName(candidate);

  if (!normalizedCandidate) {
    return false;
  }

  const candidateDigits = normalizeDigits(normalizedCandidate);
  const numberDigits = normalizeDigits(number);
  const bareLid = normalizeBareLid(lid);
  const normalizedLowerCandidate = normalizedCandidate.toLowerCase();

  if (candidateDigits && numberDigits && candidateDigits === numberDigits) {
    return false;
  }

  if (bareLid && normalizedLowerCandidate === bareLid) {
    return false;
  }

  return true;
};

const ResolveContactName = ({
  currentName,
  incomingName,
  number,
  lid,
}: {
  currentName?: string | null;
  incomingName?: string | null;
  number?: string | null;
  lid?: string | null;
}): string => {
  if (isMeaningfulName(currentName, number, lid)) {
    return normalizeName(currentName);
  }

  if (isMeaningfulName(incomingName, number, lid)) {
    return normalizeName(incomingName);
  }

  return normalizeName(currentName) || normalizeName(incomingName) || normalizeDigits(number) || normalizeBareLid(lid);
};

export default ResolveContactName;