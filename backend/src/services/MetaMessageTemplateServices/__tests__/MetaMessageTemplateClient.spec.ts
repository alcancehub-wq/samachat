import MetaMessageTemplateClient, {
  buildMetaMessageTemplatesUrl
} from "../MetaMessageTemplateClient";

describe("MetaMessageTemplateClient", () => {
  it("builds the WABA message_templates endpoint", () => {
    expect(
      buildMetaMessageTemplatesUrl(
        "1015864050707890",
        "v20.0"
      )
    ).toBe(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates"
    );
  });

  it("normalizes API version without v prefix", () => {
    expect(
      buildMetaMessageTemplatesUrl(
        "1015864050707890",
        "20.0"
      )
    ).toBe(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates"
    );
  });

  it("rejects an empty WABA id", () => {
    expect(() =>
      buildMetaMessageTemplatesUrl("", "v20.0")
    ).toThrow("ERR_META_TEMPLATE_WABA_ID_REQUIRED");
  });

  it("requires access token before exposing endpoint", () => {
    const client = new MetaMessageTemplateClient({
      accessToken: "",
      wabaId: "1015864050707890",
      apiVersion: "v20.0"
    });

    expect(() => client.getTemplatesUrl()).toThrow(
      "ERR_META_TEMPLATE_ACCESS_TOKEN_REQUIRED"
    );
  });

  it("returns the endpoint when credentials are present", () => {
    const client = new MetaMessageTemplateClient({
      accessToken: "test-token",
      wabaId: "1015864050707890",
      apiVersion: "v20.0"
    });

    expect(client.getTemplatesUrl()).toBe(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates"
    );
  });
});
