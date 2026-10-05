import {
  ResolveCrmM2mSecret,
  ValidateCrmM2mSecretReference
} from "../CrmM2mSecretResolver";

it("accepts an opaque bounded secret reference", () => {
  expect(
    ValidateCrmM2mSecretReference(
      "vault://samachat/crm/m2m/primary"
    )
  ).toBe("vault://samachat/crm/m2m/primary");
});

it.each([
  "",
  " leading",
  "trailing ",
  "x".repeat(256)
])("rejects invalid secret reference", value => {
  expect(() =>
    ValidateCrmM2mSecretReference(value)
  ).toThrow("CRM_M2M_SECRET_REFERENCE_INVALID");
});

it("resolves through an explicitly injected resolver", async () => {
  const original = new Uint8Array(32);
  original.fill(7);

  const resolver = {
    resolve: jest.fn(async () => original)
  };

  const value = await ResolveCrmM2mSecret(
    "vault://synthetic/reference",
    resolver
  );

  expect(resolver.resolve).toHaveBeenCalledWith(
    "vault://synthetic/reference"
  );

  expect(value).toEqual(original);
  expect(value).not.toBe(original);
});

it("fails closed when resolver is unavailable", async () => {
  await expect(
    ResolveCrmM2mSecret(
      "vault://synthetic/reference",
      null as any
    )
  ).rejects.toThrow("CRM_M2M_SECRET_RESOLVER_UNAVAILABLE");
});

it("fails closed when resolver throws", async () => {
  await expect(
    ResolveCrmM2mSecret(
      "vault://synthetic/reference",
      {
        resolve: async () => {
          throw new Error("synthetic provider failure");
        }
      }
    )
  ).rejects.toThrow("CRM_M2M_SECRET_RESOLUTION_FAILED");
});

it("rejects a resolved secret shorter than 32 bytes", async () => {
  await expect(
    ResolveCrmM2mSecret(
      "vault://synthetic/reference",
      {
        resolve: async () => new Uint8Array(31)
      }
    )
  ).rejects.toThrow("CRM_M2M_SECRET_INVALID");
});

it("rejects a non-byte secret result", async () => {
  await expect(
    ResolveCrmM2mSecret(
      "vault://synthetic/reference",
      {
        resolve: async () => "not-secret-bytes" as any
      }
    )
  ).rejects.toThrow("CRM_M2M_SECRET_INVALID");
});
