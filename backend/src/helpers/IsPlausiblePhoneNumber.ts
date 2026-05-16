const normalizeDigits = (value?: string | null): string => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.replace(/\D/g, "");
};

const IsPlausiblePhoneNumber = (value?: string | null): value is string => {
  const normalizedValue = normalizeDigits(value);

  return normalizedValue.length >= 8 && normalizedValue.length <= 15;
};

export default IsPlausiblePhoneNumber;