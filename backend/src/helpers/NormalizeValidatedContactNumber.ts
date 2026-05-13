interface WhatsAppLookupResult {
  user?: string | null;
  server?: string | null;
  _serialized?: string | null;
}

const normalizeDigits = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.replace(/\D/g, "");
};

const isPhoneServer = (value?: string | null): boolean => {
  return value === "c.us";
};

const NormalizeValidatedContactNumber = (
  candidate: string,
  validNumber?: WhatsAppLookupResult | null
): string => {
  const normalizedCandidate = normalizeDigits(candidate);
  const normalizedUser = normalizeDigits(validNumber?.user);
  const serialized = validNumber?._serialized || "";
  const serializedUsesPhoneServer = /@c\.us$/i.test(serialized);

  if (!normalizedCandidate || !normalizedUser) {
    return "";
  }

  if (isPhoneServer(validNumber?.server) || serializedUsesPhoneServer) {
    return normalizedUser;
  }

  return normalizedCandidate;
};

export default NormalizeValidatedContactNumber;