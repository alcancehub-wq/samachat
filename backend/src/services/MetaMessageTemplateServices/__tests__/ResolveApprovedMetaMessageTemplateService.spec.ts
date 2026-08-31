import ResolveApprovedMetaMessageTemplateService from "../ResolveApprovedMetaMessageTemplateService";

describe("ResolveApprovedMetaMessageTemplateService", () => {
  const connection = {
    providerType: "official",
    accessToken: "test-token",
    wabaId: "1015864050707890",
    apiVersion: "v20.0"
  };

  it("requires template name before calling executor", async () => {
    const executor = jest.fn();

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "   ",
        language: "pt_BR",
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_NAME_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("requires template language before calling executor", async () => {
    const executor = jest.fn();

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "   ",
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_LANGUAGE_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("returns approved template from first page", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [
          {
            id: "tpl-1",
            name: "boas_vindas",
            language: "pt_BR",
            status: "APPROVED"
          }
        ]
      })
    });

    const result =
      await ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "pt_BR",
        getExecutor: executor
      });

    expect(result.id).toBe("tpl-1");
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("follows after cursor until approved template is found", async () => {
    const executor = jest
      .fn()
      .mockResolvedValueOnce({
        statusCode: 200,
        body: JSON.stringify({
          data: [],
          paging: {
            cursors: {
              after: "cursor-page-2"
            }
          }
        })
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: JSON.stringify({
          data: [
            {
              id: "tpl-2",
              name: "boas_vindas",
              language: "pt_BR",
              status: "APPROVED"
            }
          ]
        })
      });

    const result =
      await ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "pt_BR",
        getExecutor: executor
      });

    expect(result.id).toBe("tpl-2");

    expect(executor).toHaveBeenNthCalledWith(
      2,
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates?after=cursor-page-2",
      "test-token"
    );
  });

  it("fails closed when matching template is not approved", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [
          {
            name: "boas_vindas",
            language: "pt_BR",
            status: "PENDING"
          }
        ]
      })
    });

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "pt_BR",
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_NOT_APPROVED"
    });
  });

  it("fails closed when template is not found", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: []
      })
    });

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "inexistente",
        language: "pt_BR",
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_NOT_FOUND"
    });
  });

  it("detects repeated after cursor", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [],
        paging: {
          cursors: {
            after: "same-cursor"
          }
        }
      })
    });

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "pt_BR",
        getExecutor: executor
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_PAGINATION_LOOP_DETECTED"
    });

    expect(executor).toHaveBeenCalledTimes(2);
  });

  it("enforces max page limit", async () => {
    const executor = jest
      .fn()
      .mockResolvedValueOnce({
        statusCode: 200,
        body: JSON.stringify({
          data: [],
          paging: {
            cursors: {
              after: "cursor-2"
            }
          }
        })
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        body: JSON.stringify({
          data: [],
          paging: {
            cursors: {
              after: "cursor-3"
            }
          }
        })
      });

    await expect(
      ResolveApprovedMetaMessageTemplateService({
        connection,
        name: "boas_vindas",
        language: "pt_BR",
        getExecutor: executor,
        maxPages: 2
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_PAGINATION_LIMIT_REACHED"
    });

    expect(executor).toHaveBeenCalledTimes(2);
  });
});