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

  it("does not permit list without an injected GET executor", async () => {
    const client = new MetaMessageTemplateClient({
      accessToken: "test-token",
      wabaId: "1015864050707890",
      apiVersion: "v20.0"
    });

    await expect(
      client.listTemplates()
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_GET_EXECUTOR_REQUIRED"
    });
  });

  it("lists templates through the injected executor only", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [
          {
            id: "template-1",
            name: "boas_vindas",
            language: "pt_BR",
            status: "APPROVED",
            category: "UTILITY",
            components: [
              {
                type: "BODY",
                text: "Ola {{1}}"
              }
            ]
          }
        ],
        paging: {
          cursors: {
            after: "cursor-next"
          }
        }
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      executor
    );

    const result = await client.listTemplates();

    expect(executor).toHaveBeenCalledTimes(1);

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates",
      "test-token"
    );

    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      id: "template-1",
      name: "boas_vindas",
      language: "pt_BR",
      status: "APPROVED",
      category: "UTILITY"
    });

    expect(result.paging?.cursors?.after).toBe(
      "cursor-next"
    );
  });

  it("returns a generic status error without exposing the Meta body", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 403,
      body: JSON.stringify({
        error: {
          message: "sensitive upstream detail"
        }
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "secret-test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      executor
    );

    await expect(
      client.listTemplates()
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_LIST_FAILED: 403"
    });
  });

  it("rejects malformed successful response", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: "not-json"
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      executor
    );

    await expect(
      client.listTemplates()
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_INVALID_RESPONSE"
    });
  });
});
