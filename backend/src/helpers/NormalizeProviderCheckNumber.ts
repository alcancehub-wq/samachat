const NormalizeProviderCheckNumber = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  const [jidUser = ""] = value.split("@");
  const [phoneUser = ""] = jidUser.split(":");

  return phoneUser.replace(/\D/g, "");
};

export default NormalizeProviderCheckNumber;