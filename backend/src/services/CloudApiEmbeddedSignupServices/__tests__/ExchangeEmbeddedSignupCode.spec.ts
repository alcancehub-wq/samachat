import ExchangeEmbeddedSignupCode, {
  buildEmbeddedSignupTokenUrl,
  OAuthRequestExecutor
} from "../ExchangeEmbeddedSignupCode";

describe("ExchangeEmbeddedSignupCode", () => {
  it("builds the Meta OAuth URL with backend credentials", () => {
    const url = new URL(
      buildEmbeddedSignupTokenUrl({
        code: "temporary-code",
        appId: "123456",
        appSecret: "backend-secret",
        apiVersion: "v25.0"
      })
    );

    expect(url.origin).toBe("https://graph.facebook.com");
    expect(url.pathname).toBe("/v25.0/oauth/access_token");
    expect(url.searchParams.get("client_id")).toBe("123456");
    expect(url.searchParams.get("client_secret")).toBe(
      "backend-secret"
    );
    expect(url.searchParams.get("code")).toBe("temporary-code");
  });

  it("normalizes an API version without the v prefix", () => {
    const url = new URL(
      buildEmbeddedSignupTokenUrl({
        code: "temporary-code",
        appId: "123456",
        appSecret: "backend-secret",
        apiVersion: "25.0"
      })
    );

    expect(url.pathname).toBe("/v25.0/oauth/access_token");
  });

  it("rejects an empty authorization code before any HTTP call", async () => {
    const executor = jest.fn();

    await expect(
      ExchangeEmbeddedSignupCode(
        {
          code: " ",
          appId: "123456",
          appSecret: "backend-secret"
        },
        executor
      )
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_CODE_REQUIRED",
      statusCode: 400
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("returns a token from a successful Meta response", async () => {
    const executor: OAuthRequestExecutor = jest
      .fn()
      .mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          access_token: "business-token",
          token_type: "bearer",
          expires_in: 5184000
        })
      });

    const result = await ExchangeEmbeddedSignupCode(
      {
        code: "temporary-code",
        appId: "123456",
        appSecret: "backend-secret"
      },
      executor
    );

    expect(result).toEqual({
      accessToken: "business-token",
      tokenType: "bearer",
      expiresIn: 5184000
    });
  });

  it("does not expose Meta messages, code or secrets in an error", async () => {
    const executor: OAuthRequestExecutor = jest
      .fn()
      .mockResolvedValue({
        statusCode: 400,
        body: JSON.stringify({
          error: {
            message:
              "Invalid code temporary-code using backend-secret",
            type: "OAuthException",
            code: 100,
            error_subcode: 36008
          }
        })
      });

    let thrownError: Error | undefined;

    try {
      await ExchangeEmbeddedSignupCode(
        {
          code: "temporary-code",
          appId: "123456",
          appSecret: "backend-secret"
        },
        executor
      );
    } catch (err) {
      thrownError = err as Error;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError?.message).toContain(
      "ERR_EMBEDDED_SIGNUP_CODE_EXCHANGE_FAILED"
    );
    expect(thrownError?.message).toContain("META_100");
    expect(thrownError?.message).toContain("SUB_36008");
    expect(thrownError?.message).not.toContain("temporary-code");
    expect(thrownError?.message).not.toContain("backend-secret");
    expect(thrownError?.message).not.toContain("Invalid code");
  });

  it("rejects a successful response without an access token", async () => {
    const executor: OAuthRequestExecutor = jest
      .fn()
      .mockResolvedValue({
        statusCode: 200,
        body: JSON.stringify({
          token_type: "bearer"
        })
      });

    await expect(
      ExchangeEmbeddedSignupCode(
        {
          code: "temporary-code",
          appId: "123456",
          appSecret: "backend-secret"
        },
        executor
      )
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_ACCESS_TOKEN_MISSING",
      statusCode: 502
    });
  });

  it("converts network failures into a sanitized backend error", async () => {
    const executor: OAuthRequestExecutor = jest
      .fn()
      .mockRejectedValue(
        new Error("network failed with backend-secret")
      );

    await expect(
      ExchangeEmbeddedSignupCode(
        {
          code: "temporary-code",
          appId: "123456",
          appSecret: "backend-secret"
        },
        executor
      )
    ).rejects.toMatchObject({
      message: "ERR_EMBEDDED_SIGNUP_META_UNAVAILABLE",
      statusCode: 502
    });
  });
});
