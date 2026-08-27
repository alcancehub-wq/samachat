import CreateMetaMessageTemplateService from "../CreateMetaMessageTemplateService";

describe("CreateMetaMessageTemplateService", () => {
  it("creates template through an official connection and injected POST executor", async () => {
    const postExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        id: "template-created-1",
        status: "PENDING",
        category: "UTILITY"
      })
    });

    const template = {
      name: "boas_vindas",
      language: "pt_BR",
      category: "UTILITY",
      components: [
        {
          type: "BODY",
          text: "Olá"
        }
      ]
    };

    const result = await CreateMetaMessageTemplateService({
      connection: {
        providerType: "official",
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      template,
      postExecutor
    });

    expect(postExecutor).toHaveBeenCalledTimes(1);

    expect(postExecutor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates",
      "test-token",
      JSON.stringify(template)
    );

    expect(result).toEqual({
      id: "template-created-1",
      status: "PENDING",
      category: "UTILITY"
    });
  });

  it("rejects non-official connection before calling POST executor", async () => {
    const postExecutor = jest.fn();

    await expect(
      CreateMetaMessageTemplateService({
        connection: {
          providerType: "wwebjs",
          accessToken: "test-token",
          wabaId: "1015864050707890",
          apiVersion: "v20.0"
        },
        template: {
          name: "boas_vindas",
          language: "pt_BR",
          category: "UTILITY"
        },
        postExecutor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED"
    });

    expect(postExecutor).not.toHaveBeenCalled();
  });
});