import MetaMessageTemplateClient from "../MetaMessageTemplateClient";
import { logger } from "../../../utils/logger";

describe("MetaMessageTemplateClient create diagnostic", () => {
  it("logs sanitized Meta create diagnostic while keeping client error generic", async () => {
    const warnSpy = jest
      .spyOn(logger, "warn")
      .mockImplementation(() => undefined as never);

    const postExecutor = jest.fn().mockResolvedValue({
      statusCode: 400,
      body: JSON.stringify({
        error: {
          message: "Invalid parameter",
          type: "OAuthException",
          code: 100,
          error_subcode: 2494073,
          fbtrace_id: "TRACE123"
        }
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

    await expect(
      client.createTemplate({
        name: "teste_variavel",
        language: "pt_BR",
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: "Olá {{1}}"
          }
        ]
      })
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_CREATE_FAILED: 400"
    });

    expect(warnSpy).toHaveBeenCalledWith(
      {
        statusCode: 400,
        metaErrorType: "OAuthException",
        metaErrorCode: 100,
        metaErrorSubcode: 2494073,
        metaErrorMessage: "Invalid parameter",
        metaFbtraceId: "TRACE123"
      },
      "Meta template upstream create failure"
    );

    expect(String(
      await client
        .createTemplate({
          name: "teste_variavel",
          language: "pt_BR",
          category: "UTILITY"
        })
        .catch(error => error)
    )).not.toContain("Invalid parameter");

    warnSpy.mockRestore();
  });
});