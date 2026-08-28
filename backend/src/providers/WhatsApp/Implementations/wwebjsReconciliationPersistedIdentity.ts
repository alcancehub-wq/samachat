const normalize = (
  value?: string | null
): string =>
  typeof value === "string"
    ? value.trim()
    : "";

const ExtractWWebJsPersistedTargetLidAliases = (
  messageIds: Array<
    string | null | undefined
  >
): string[] => {
  const aliases =
    new Set<string>();

  for (const rawValue of messageIds) {
    const value =
      normalize(rawValue);

    if (!value) {
      continue;
    }

    const matches =
      value.match(
        /[0-9]{5,}@lid/gi
      ) || [];

    for (const match of matches) {
      aliases.add(
        match.toLowerCase()
      );
    }
  }

  return Array.from(aliases);
};

export default ExtractWWebJsPersistedTargetLidAliases;
