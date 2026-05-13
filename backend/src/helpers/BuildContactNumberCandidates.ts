const normalizeDigits = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.replace(/\D/g, "");
};

const extractSessionCountryCode = (
  sessionPhoneNumber?: string | null
): string => {
  const normalizedSessionPhone = normalizeDigits(sessionPhoneNumber);

  if (normalizedSessionPhone.startsWith("55") && normalizedSessionPhone.length >= 12) {
    return "55";
  }

  return "";
};

const looksLikeBrazilianLocalNumber = (value: string): boolean => {
  if (/^[1-9]{2}9\d{8}$/.test(value)) {
    return true;
  }

  if (/^[1-9]{2}[2-8]\d{7}$/.test(value)) {
    return true;
  }

  return false;
};

const BuildContactNumberCandidates = (
  value: string,
  sessionPhoneNumber?: string | null
): string[] => {
  const normalizedValue = normalizeDigits(value);

  if (!normalizedValue) {
    return [];
  }

  const candidates = new Set<string>([normalizedValue]);
  const sessionCountryCode = extractSessionCountryCode(sessionPhoneNumber);

  if (
    sessionCountryCode &&
    !normalizedValue.startsWith(sessionCountryCode) &&
    looksLikeBrazilianLocalNumber(normalizedValue)
  ) {
    candidates.add(`${sessionCountryCode}${normalizedValue}`);
  }

  return Array.from(candidates);
};

export default BuildContactNumberCandidates;