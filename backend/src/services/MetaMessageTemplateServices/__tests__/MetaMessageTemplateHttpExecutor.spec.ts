import { EventEmitter } from "events";
import {
  createMetaMessageTemplateGetExecutor,
  MetaMessageTemplateHttpsRequest
} from "../MetaMessageTemplateHttpExecutor";

describe("MetaMessageTemplateHttpExecutor", () => {
  const buildRequestFactory = (
    statusCode: number,
    body: string
  ) => {
    const requestEmitter = new EventEmitter() as any;

    requestEmitter.end = jest.fn();

    const requestFactory = jest.fn(
      (
        options: any,
        callback: (response: any) => void
      ) => {
        const response = new EventEmitter() as any;

        response.statusCode = statusCode;
        response.setEncoding = jest.fn();

        process.nextTick(() => {
          callback(response);
          response.emit("data", body);
          response.emit("end");
        });

        return requestEmitter;
      }
    ) as unknown as MetaMessageTemplateHttpsRequest;

    return {
      requestFactory,
      requestEmitter
    };
  };

  it("performs GET against graph.facebook.com with bearer token", async () => {
    const {
      requestFactory,
      requestEmitter
    } = buildRequestFactory(
      200,
      JSON.stringify({
        data: []
      })
    );

    const executor =
      createMetaMessageTemplateGetExecutor(
        requestFactory
      );

    const result = await executor(
      "https://graph.facebook.com/v20.0/test-waba/message_templates",
      "test-token"
    );

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        data: []
      })
    });

    expect(requestFactory).toHaveBeenCalledTimes(1);

    const call = (requestFactory as any).mock.calls[0];

    expect(call[0]).toMatchObject({
      protocol: "https:",
      hostname: "graph.facebook.com",
      path: "/v20.0/test-waba/message_templates",
      method: "GET",
      headers: {
        Authorization: "Bearer test-token",
        Accept: "application/json"
      }
    });

    expect(requestEmitter.end).toHaveBeenCalledTimes(1);
  });

  it("preserves query string in the request path", async () => {
    const {
      requestFactory
    } = buildRequestFactory(
      200,
      JSON.stringify({
        data: []
      })
    );

    const executor =
      createMetaMessageTemplateGetExecutor(
        requestFactory
      );

    await executor(
      "https://graph.facebook.com/v20.0/test-waba/message_templates?after=cursor-1",
      "test-token"
    );

    const call = (requestFactory as any).mock.calls[0];

    expect(call[0].path).toBe(
      "/v20.0/test-waba/message_templates?after=cursor-1"
    );
  });

  it("rejects non-HTTPS URLs before opening a request", async () => {
    const {
      requestFactory
    } = buildRequestFactory(
      200,
      "{}"
    );

    const executor =
      createMetaMessageTemplateGetExecutor(
        requestFactory
      );

    await expect(
      executor(
        "http://graph.facebook.com/v20.0/test-waba/message_templates",
        "test-token"
      )
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_HTTP_URL_INVALID"
    });

    expect(requestFactory).not.toHaveBeenCalled();
  });

  it("rejects hosts outside graph.facebook.com", async () => {
    const {
      requestFactory
    } = buildRequestFactory(
      200,
      "{}"
    );

    const executor =
      createMetaMessageTemplateGetExecutor(
        requestFactory
      );

    await expect(
      executor(
        "https://example.com/v20.0/test-waba/message_templates",
        "test-token"
      )
    ).rejects.toMatchObject({
      message: "ERR_META_TEMPLATE_HTTP_URL_INVALID"
    });

    expect(requestFactory).not.toHaveBeenCalled();
  });

  it("propagates request transport errors", async () => {
    const requestEmitter = new EventEmitter() as any;

    requestEmitter.end = jest.fn(() => {
      process.nextTick(() => {
        requestEmitter.emit(
          "error",
          new Error("network-test-error")
        );
      });
    });

    const requestFactory = jest.fn(
      () => requestEmitter
    ) as unknown as MetaMessageTemplateHttpsRequest;

    const executor =
      createMetaMessageTemplateGetExecutor(
        requestFactory
      );

    await expect(
      executor(
        "https://graph.facebook.com/v20.0/test-waba/message_templates",
        "test-token"
      )
    ).rejects.toThrow("network-test-error");
  });
});
