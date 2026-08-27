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



  it("does not permit create without an injected POST executor", async () => {
    const client = new MetaMessageTemplateClient({
      accessToken: "test-token",
      wabaId: "1015864050707890",
      apiVersion: "v20.0"
    });

    await expect(
      client.createTemplate({
        name: "boas_vindas",
        language: "pt_BR",
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: "Olá"
          }
        ]
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_POST_EXECUTOR_REQUIRED"
    });
  });

  it("returns generic create status error without exposing the Meta body", async () => {
    const postExecutor = jest.fn().mockResolvedValue({
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
      undefined,
      postExecutor
    );

    await expect(
      client.createTemplate({
        name: "boas_vindas",
        language: "pt_BR",
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: "Olá"
          }
        ]
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_CREATE_FAILED: 403"
    });

    try {
      await client.createTemplate({
        name: "boas_vindas",
        language: "pt_BR",
        category: "UTILITY"
      });
    } catch (error) {
      expect(String(error)).not.toContain(
        "sensitive upstream detail"
      );
      expect(String(error)).not.toContain(
        "secret-test-token"
      );
    }
  });

  it("rejects malformed successful create response", async () => {
    const postExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: "not-json"
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      postExecutor
    );

    await expect(
      client.createTemplate({
        name: "boas_vindas",
        language: "pt_BR",
        category: "UTILITY"
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_INVALID_RESPONSE"
    });
  });


  it("does not permit delete without an injected DELETE executor", async () => {
    const client = new MetaMessageTemplateClient({
      accessToken: "test-token",
      wabaId: "1015864050707890",
      apiVersion: "v20.0"
    });

    await expect(
      client.deleteTemplate("boas_vindas")
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_DELETE_EXECUTOR_REQUIRED"
    });
  });

  it("rejects delete with an empty template name", async () => {
    const deleteExecutor = jest.fn();

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      undefined,
      deleteExecutor
    );

    await expect(
      client.deleteTemplate("   ")
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_NAME_REQUIRED"
    });

    expect(deleteExecutor).not.toHaveBeenCalled();
  });

  it("returns generic delete status error without exposing the Meta body", async () => {
    const deleteExecutor = jest.fn().mockResolvedValue({
      statusCode: 403,
      body: JSON.stringify({
        error: {
          message: "sensitive upstream delete detail"
        }
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "secret-delete-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      undefined,
      deleteExecutor
    );

    await expect(
      client.deleteTemplate("boas_vindas")
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_DELETE_FAILED: 403"
    });

    try {
      await client.deleteTemplate("boas_vindas");
    } catch (error) {
      expect(String(error)).not.toContain(
        "sensitive upstream delete detail"
      );

      expect(String(error)).not.toContain(
        "secret-delete-token"
      );
    }
  });

  it("rejects malformed successful delete response", async () => {
    const deleteExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: "not-json"
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      undefined,
      deleteExecutor
    );

    await expect(
      client.deleteTemplate("boas_vindas")
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_INVALID_RESPONSE"
    });
  });

  it("rejects delete response without boolean success", async () => {
    const deleteExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        success: "true"
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      undefined,
      deleteExecutor
    );

    await expect(
      client.deleteTemplate("boas_vindas")
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_INVALID_RESPONSE"
    });
  });
  it("deletes template through the injected DELETE executor", async () => {
    const deleteExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ignored: "must-not-leak"
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      undefined,
      deleteExecutor
    );

    const result = await client.deleteTemplate(
      "boas vindas"
    );

    expect(deleteExecutor).toHaveBeenCalledTimes(1);

    expect(deleteExecutor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates?name=boas%20vindas",
      "test-token"
    );

    expect(result).toEqual({
      success: true
    });

    expect(
      Object.prototype.hasOwnProperty.call(
        result,
        "ignored"
      )
    ).toBe(false);
  });
  it("creates template through the injected POST executor", async () => {
    const postExecutor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        id: "template-created-1",
        status: "PENDING",
        category: "UTILITY",
        ignored: "must-not-leak"
      })
    });

    const client = new MetaMessageTemplateClient(
      {
        accessToken: "test-token",
        wabaId: "1015864050707890",
        apiVersion: "v20.0"
      },
      undefined,
      postExecutor
    );

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

    const result = await client.createTemplate(template);

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

    expect(
      Object.prototype.hasOwnProperty.call(
        result,
        "ignored"
      )
    ).toBe(false);
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

  it("removes raw Meta paging URLs and exposes cursors only", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        data: [],
        paging: {
          cursors: {
            before: "cursor-before",
            after: "cursor-after"
          },
          next:
            "https://graph.facebook.com/v20.0/test/message_templates?after=cursor-after&access_token=SECRET_TOKEN",
          previous:
            "https://graph.facebook.com/v20.0/test/message_templates?before=cursor-before&access_token=SECRET_TOKEN"
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

    const result = await client.listTemplates();

    expect(result).toEqual({
      data: [],
      paging: {
        cursors: {
          before: "cursor-before",
          after: "cursor-after"
        }
      }
    });

    expect(JSON.stringify(result)).not.toContain(
      "SECRET_TOKEN"
    );
    expect(JSON.stringify(result)).not.toContain(
      "graph.facebook.com"
    );
    expect(
      Object.prototype.hasOwnProperty.call(
        result.paging || {},
        "next"
      )
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        result.paging || {},
        "previous"
      )
    ).toBe(false);
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
