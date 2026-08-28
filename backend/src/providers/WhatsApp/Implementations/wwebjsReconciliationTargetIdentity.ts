interface WWebJsTargetIdentitySession {
  getContactLidAndPhone?: (
    userIds: string[] | string
  ) => Promise<
    Array<{
      lid?: string | null;
      pn?: string | null;
    }>
  >;
}

const normalizeIdentity = (
  value?: string | null
): string =>
  typeof value === "string"
    ? value.trim()
    : "";

const ResolveWWebJsTargetProviderAliases = async ({
  session,
  numberCandidates
}: {
  session: WWebJsTargetIdentitySession;
  numberCandidates: string[];
}): Promise<string[]> => {
  if (
    typeof session.getContactLidAndPhone !==
    "function"
  ) {
    return [];
  }

  const providerIds =
    numberCandidates
      .map(value =>
        normalizeIdentity(value)
      )
      .filter(Boolean)
      .map(value =>
        value.includes("@")
          ? value
          : `${value}@c.us`
      );

  if (!providerIds.length) {
    return [];
  }

  const resolved =
    await session.getContactLidAndPhone(
      providerIds
    );

  const aliases = new Set<string>();

  for (const item of resolved || []) {
    const pn =
      normalizeIdentity(item?.pn);

    const lid =
      normalizeIdentity(item?.lid);

    if (pn) aliases.add(pn);
    if (lid) aliases.add(lid);
  }

  return Array.from(aliases);
};

export default ResolveWWebJsTargetProviderAliases;
