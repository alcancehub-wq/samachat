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

const looksLikeBrazilianLocalNumber = (value: string): boolean => {
  return /^[1-9]{2}9\d{8}$/.test(value) || /^[1-9]{2}[2-8]\d{7}$/.test(value);
};

const addBrazilianMobileVariants = (
  localNumber: string,
  candidates: string[]
): void => {
  if (!looksLikeBrazilianLocalNumber(localNumber)) {
    return;
  }

  pushCandidate(candidates, localNumber);
  pushCandidate(candidates, `55${localNumber}`);

  if (/^[1-9]{2}9\d{8}$/.test(localNumber)) {
    const withoutNinthDigit = `${localNumber.slice(0, 2)}${localNumber.slice(3)}`;
    pushCandidate(candidates, withoutNinthDigit);
    pushCandidate(candidates, `55${withoutNinthDigit}`);
  }

  if (/^[1-9]{2}[6-9]\d{7}$/.test(localNumber)) {
    const withNinthDigit = `${localNumber.slice(0, 2)}9${localNumber.slice(2)}`;
    pushCandidate(candidates, withNinthDigit);
    pushCandidate(candidates, `55${withNinthDigit}`);
  }
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

  if (normalizedValue.startsWith("55") && normalizedValue.length > 4) {
    addBrazilianMobileVariants(normalizedValue.slice(2), candidates);
  } else {
    addBrazilianMobileVariants(normalizedValue, candidates);
  }

  return candidates;
};

export default BuildEquivalentContactNumberCandidates;
