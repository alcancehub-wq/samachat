export interface CrmM2mSecretResolver {
  resolve(secretReference: string): Promise<Uint8Array>;
}

export function ValidateCrmM2mSecretReference(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length < 1 ||
    value.length > 255
  ) {
    throw new Error("CRM_M2M_SECRET_REFERENCE_INVALID");
  }

  return value;
}

export async function ResolveCrmM2mSecret(
  secretReference: string,
  resolver: CrmM2mSecretResolver
): Promise<Uint8Array> {
  const reference = ValidateCrmM2mSecretReference(secretReference);

  if (
    !resolver ||
    typeof resolver.resolve !== "function"
  ) {
    throw new Error("CRM_M2M_SECRET_RESOLVER_UNAVAILABLE");
  }

  let secret: Uint8Array;

  try {
    secret = await resolver.resolve(reference);
  } catch {
    throw new Error("CRM_M2M_SECRET_RESOLUTION_FAILED");
  }

  if (
    !(secret instanceof Uint8Array) ||
    secret.byteLength < 32
  ) {
    throw new Error("CRM_M2M_SECRET_INVALID");
  }

  return new Uint8Array(secret);
}
