import SerializeWhatsAppForClient from "../SerializeWhatsAppForClient";

describe("SerializeWhatsAppForClient", () => {
  it("removes Meta credentials and exposes presence flags", () => {
    const whatsapp = {
      id: 35,
      name: "Larissa",
      providerType: "official",
      phoneNumberId: "629748506897910",
      wabaId: "1015864050707890",
      accessToken: "secret-access-token",
      verifyToken: "secret-verify-token",
      appSecret: "secret-app-secret",
      toJSON() {
        return {
          id: this.id,
          name: this.name,
          providerType: this.providerType,
          phoneNumberId: this.phoneNumberId,
          wabaId: this.wabaId,
          accessToken: this.accessToken,
          verifyToken: this.verifyToken,
          appSecret: this.appSecret
        };
      }
    } as any;

    const result = SerializeWhatsAppForClient(whatsapp);

    expect(result).not.toHaveProperty("accessToken");
    expect(result).not.toHaveProperty("verifyToken");
    expect(result).not.toHaveProperty("appSecret");

    expect(result.hasAccessToken).toBe(true);
    expect(result.hasVerifyToken).toBe(true);
    expect(result.hasAppSecret).toBe(true);

    expect(result.phoneNumberId).toBe("629748506897910");
    expect(result.wabaId).toBe("1015864050707890");
  });

  it("reports false when credentials are absent", () => {
    const result = SerializeWhatsAppForClient({
      id: 1,
      accessToken: null,
      verifyToken: "",
      appSecret: undefined
    } as any);

    expect(result.hasAccessToken).toBe(false);
    expect(result.hasVerifyToken).toBe(false);
    expect(result.hasAppSecret).toBe(false);
  });
});