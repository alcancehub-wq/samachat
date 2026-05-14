import NormalizeProviderCheckNumber from "../../../helpers/NormalizeProviderCheckNumber";

describe("NormalizeProviderCheckNumber", () => {
  it("returns digits when the provider already resolves a plain number", () => {
    expect(NormalizeProviderCheckNumber("554191470679")).toBe("554191470679");
  });

  it("extracts digits from a standard user jid", () => {
    expect(
      NormalizeProviderCheckNumber("554191470679@s.whatsapp.net")
    ).toBe("554191470679");
  });

  it("removes device suffixes from jid values", () => {
    expect(
      NormalizeProviderCheckNumber("554191470679:12@s.whatsapp.net")
    ).toBe("554191470679");
  });

  it("returns empty for empty input", () => {
    expect(NormalizeProviderCheckNumber("")).toBe("");
  });
});