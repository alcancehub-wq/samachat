import MetaMessageTemplateClient from "../MetaMessageTemplateClient";

describe("MetaMessageTemplateClient pagination", () => {
  const credentials = {
    accessToken: "test-token",
    wabaId: "1015864050707890",
    apiVersion: "v20.0"
  };

  const successResponse = {
    statusCode: 200,
    body: JSON.stringify({
      data: []
    })
  };

  it("preserves the existing URL when no cursor is provided", async () => {
    const executor = jest.fn().mockResolvedValue(successResponse);

    const client = new MetaMessageTemplateClient(
      credentials,
      executor
    );

    await client.listTemplates();

    expect(executor).toHaveBeenCalledTimes(1);

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates",
      "test-token"
    );
  });

  it("adds an encoded after cursor without exposing the access token", async () => {
    const executor = jest.fn().mockResolvedValue(successResponse);

    const client = new MetaMessageTemplateClient(
      credentials,
      executor
    );

    await client.listTemplates({
      after: " cursor next/1 "
    });

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates?after=cursor%20next%2F1",
      "test-token"
    );

    const calledUrl=executor.mock.calls[0][0];

    expect(calledUrl).not.toContain("access_token");
    expect(calledUrl).not.toContain("test-token");
  });

  it("adds an encoded before cursor", async () => {
    const executor = jest.fn().mockResolvedValue(successResponse);

    const client = new MetaMessageTemplateClient(
      credentials,
      executor
    );

    await client.listTemplates({
      before: "cursor-before"
    });

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/1015864050707890/message_templates?before=cursor-before",
      "test-token"
    );
  });

  it("rejects ambiguous pagination before calling the executor", async () => {
    const executor = jest.fn();

    const client = new MetaMessageTemplateClient(
      credentials,
      executor
    );

    await expect(
      client.listTemplates({
        after: "cursor-after",
        before: "cursor-before"
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_PAGINATION_CURSOR_AMBIGUOUS"
    });

    expect(executor).not.toHaveBeenCalled();
  });
});