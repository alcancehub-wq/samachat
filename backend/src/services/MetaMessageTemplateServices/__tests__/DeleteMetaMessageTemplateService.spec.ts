import DeleteMetaMessageTemplateService from "../DeleteMetaMessageTemplateService";

describe("DeleteMetaMessageTemplateService", () => {
  it("deletes template through an official connection and injected DELETE executor", async () => {
    const deleteExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        success: true
      })
    });

    const result = await DeleteMetaMessageTemplateService({
      connection: {
        providerType: "official",
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      name: "boas vindas",
      deleteExecutor
    });

    expect(deleteExecutor).toHaveBeenCalledTimes(1);

    expect(deleteExecutor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates?name=boas%20vindas",
      "test-token"
    );

    expect(result).toEqual({
      success: true
    });
  });

  it("rejects non-official connection before calling DELETE executor", async () => {
    const deleteExecutor = jest.fn();

    await expect(
      DeleteMetaMessageTemplateService({
        connection: {
          providerType: "wwebjs",
          accessToken: "test-token",
          wabaId: "1015864050707890",
          apiVersion: "v20.0"
        },
        name: "boas_vindas",
        deleteExecutor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED"
    });

    expect(deleteExecutor).not.toHaveBeenCalled();
  });

  it("rejects empty template name without calling DELETE executor", async () => {
    const deleteExecutor = jest.fn();

    await expect(
      DeleteMetaMessageTemplateService({
        connection: {
          providerType: "official",
          accessToken: "test-token",
          wabaId: "1015864050707890",
          apiVersion: "v20.0"
        },
        name: "   ",
        deleteExecutor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_NAME_REQUIRED"
    });

    expect(deleteExecutor).not.toHaveBeenCalled();
  });
});