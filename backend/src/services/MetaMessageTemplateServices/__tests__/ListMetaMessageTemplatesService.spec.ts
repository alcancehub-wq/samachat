import ListMetaMessageTemplatesService from "../ListMetaMessageTemplatesService";

describe("ListMetaMessageTemplatesService", () => {
  it("rejects non-official connections before executor use", async () => {
    const executor = jest.fn();

    await expect(
      ListMetaMessageTemplatesService({
        connection: {
          providerType: "legacy",
          accessToken: "test-token",
          wabaId: "test-waba",
          apiVersion: "v20.0"
        },
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message:
        "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("normalizes official provider type", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: []
      })
    });

    const result =
      await ListMetaMessageTemplatesService({
        connection: {
          providerType: " OFFICIAL ",
          accessToken: "test-token",
          wabaId: "test-waba",
          apiVersion: "20.0"
        },
        getExecutor: executor
      });

    expect(result.data).toEqual([]);

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/test-waba/message_templates",
      "test-token"
    );
  });

  it("passes official connection credentials only to the client executor", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [
          {
            id: "template-1",
            name: "boas_vindas",
            language: "pt_BR",
            status: "APPROVED",
            category: "UTILITY"
          }
        ]
      })
    });

    const result =
      await ListMetaMessageTemplatesService({
        connection: {
          providerType: "official",
          accessToken: "isolated-test-token",
          wabaId: "isolated-test-waba",
          apiVersion: "v20.0"
        },
        getExecutor: executor
      });

    expect(executor).toHaveBeenCalledTimes(1);

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/isolated-test-waba/message_templates",
      "isolated-test-token"
    );

    expect(result.data?.[0]).toMatchObject({
      id: "template-1",
      name: "boas_vindas",
      language: "pt_BR",
      status: "APPROVED",
      category: "UTILITY"
    });
  });

  it("propagates missing token validation from the client", async () => {
    const executor = jest.fn();

    await expect(
      ListMetaMessageTemplatesService({
        connection: {
          providerType: "official",
          accessToken: "",
          wabaId: "test-waba",
          apiVersion: "v20.0"
        },
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message:
        "ERR_META_TEMPLATE_ACCESS_TOKEN_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("propagates missing WABA validation from the client", async () => {
    const executor = jest.fn();

    await expect(
      ListMetaMessageTemplatesService({
        connection: {
          providerType: "official",
          accessToken: "test-token",
          wabaId: "",
          apiVersion: "v20.0"
        },
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message:
        "ERR_META_TEMPLATE_WABA_ID_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("does not expose upstream error body", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 403,
      body: JSON.stringify({
        error: {
          message: "secret upstream detail"
        }
      })
    });

    await expect(
      ListMetaMessageTemplatesService({
        connection: {
          providerType: "official",
          accessToken: "secret-test-token",
          wabaId: "test-waba",
          apiVersion: "v20.0"
        },
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message:
        "ERR_META_TEMPLATE_LIST_FAILED: 403"
    });
  });
});
