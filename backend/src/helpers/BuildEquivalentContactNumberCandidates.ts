const normalizeDigits = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.replace(/\D/g, "");
};

const pushCandidate = (candidates: string[], value?: string | null): void => {
  const normalizedValue = normalizeDigits(value);

  if (!normalizedValue || candidates.includes(normalizedValue)) {
    return;
  }

  candidates.push(normalizedValue);
};

const addBrazilianLegacyMobileVariants = (
  value: string,
  candidates: string[]
): void => {
  const addLocalVariants = (countryPrefix: string, localNumber: string): void => {
    if (/^[1-9]{2}9\d{8}$/.test(localNumber)) {
      pushCandidate(
        candidates,
        `${countryPrefix}${localNumber.slice(0, 2)}${localNumber.slice(3)}`
      );
    }

    if (/^[1-9]{2}[6-9]\d{7}$/.test(localNumber)) {
      pushCandidate(
        candidates,
        `${countryPrefix}${localNumber.slice(0, 2)}9${localNumber.slice(2)}`
      );
    }
  };

  if (value.startsWith("55")) {
    addLocalVariants("55", value.slice(2));
  }

  addLocalVariants("", value);
};

const BuildEquivalentContactNumberCandidates = (
  value?: string | null
): string[] => {
  const normalizedValue = normalizeDigits(value);

  if (!normalizedValue) {
    return [];
  }

  const candidates: string[] = [];
  pushCandidate(candidates, normalizedValue);
  addBrazilianLegacyMobileVariants(normalizedValue, candidates);

  return candidates;
};

export default BuildEquivalentContactNumberCandidates;