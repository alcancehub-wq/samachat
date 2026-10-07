import {
  decryptSecret,
  encryptSecret,
  isEncrypted
} from "../../../../services/IntegrationSettingsServices/secretCrypto";

const KEY = "a".repeat(64);

describe("secretCrypto (chaves nunca em texto puro no banco)", () => {
  const original = process.env.INTEGRATION_SETTINGS_ENC_KEY;
  beforeEach(() => {
    process.env.INTEGRATION_SETTINGS_ENC_KEY = KEY;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.INTEGRATION_SETTINGS_ENC_KEY;
    else process.env.INTEGRATION_SETTINGS_ENC_KEY = original;
  });

  it("cifra e decifra sem deixar o texto puro no valor guardado", () => {
    const stored = encryptSecret("sk-segredo-123", "gemini:apiKey");
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain("sk-segredo-123");
    expect(decryptSecret(stored, "gemini:apiKey")).toBe("sk-segredo-123");
  });

  it("cada cifragem usa um IV novo", () => {
    expect(encryptSecret("x", "a:b")).not.toBe(encryptSecret("x", "a:b"));
  });

  it("valor copiado para outro provedor/campo nao decifra", () => {
    const stored = encryptSecret("segredo", "gemini:apiKey");
    expect(() => decryptSecret(stored, "claude:apiKey")).toThrow();
  });

  it("sem a chave do servidor nao grava segredo", () => {
    delete process.env.INTEGRATION_SETTINGS_ENC_KEY;
    expect(() => encryptSecret("x", "a:b")).toThrow("ERR_INTEGRATION_ENC_KEY_MISSING");
  });

  it("valor legado em texto puro ainda e lido", () => {
    expect(decryptSecret("texto-puro", "a:b")).toBe("texto-puro");
  });
});
