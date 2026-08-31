import CloudApiClient, {
  buildCloudApiTemplatePayload
} from "../CloudApiClient";

describe("CloudApiClient template outbound", () => {
  const credentials = {
    accessToken: "test-token",
    phoneNumberId: "629748506897910",
    apiVersion: "v20.0"
  };

  it("builds the official WhatsApp template payload", () => {
    expect(
      buildCloudApiTemplatePayload({
        to: "+55 (11) 99999-8888",
        name: " boas_vindas ",
        languageCode: " pt_BR ",
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "Jonathan"
              }
            ]
          }
        ]
      })
    ).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5511999998888",
      type: "template",
      template: {
        name: "boas_vindas",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: "Jonathan"
              }
            ]
          }
        ]
      }
    });
  });

  it("omits components when none are supplied", () => {
    expect(
      buildCloudApiTemplatePayload({
        to: "5511999998888",
        name: "boas_vindas",
        languageCode: "pt_BR"
      })
    ).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5511999998888",
      type: "template",
      template: {
        name: "boas_vindas",
        language: {
          code: "pt_BR"
        }
      }
    });
  });

  it("rejects empty recipient", () => {
    expect(() =>
      buildCloudApiTemplatePayload({
        to: "   ",
        name: "boas_vindas",
        languageCode: "pt_BR"
      })
    ).toThrow("ERR_CLOUD_API_TO_REQUIRED");
  });

  it("rejects empty template name", () => {
    expect(() =>
      buildCloudApiTemplatePayload({
        to: "5511999998888",
        name: "   ",
        languageCode: "pt_BR"
      })
    ).toThrow(
      "ERR_CLOUD_API_TEMPLATE_NAME_REQUIRED"
    );
  });

  it("rejects empty template language", () => {
    expect(() =>
      buildCloudApiTemplatePayload({
        to: "5511999998888",
        name: "boas_vindas",
        languageCode: "   "
      })
    ).toThrow(
      "ERR_CLOUD_API_TEMPLATE_LANGUAGE_REQUIRED"
    );
  });

  it("sends template through the existing messages endpoint and executor", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        messages: [
          {
            id: "wamid.template"
          }
        ]
      })
    });

    const client = new CloudApiClient(
      credentials,
      executor
    );

    const result = await client.sendTemplate({
      to: "+55 11 99999-8888",
      name: "boas_vindas",
      languageCode: "pt_BR",
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: "Jonathan"
            }
          ]
        }
      ]
    });

    expect(result.messages?.[0]?.id).toBe(
      "wamid.template"
    );

    expect(executor).toHaveBeenCalledTimes(1);

    expect(executor).toHaveBeenCalledWith(
      "https://graph.facebook.com/v20.0/629748506897910/messages",
      "test-token",
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "5511999998888",
        type: "template",
        template: {
          name: "boas_vindas",
          language: {
            code: "pt_BR"
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: "Jonathan"
                }
              ]
            }
          ]
        }
      }
    );
  });

  it("requires access token before invoking executor", async () => {
    const executor = jest.fn();

    const client = new CloudApiClient(
      {
        ...credentials,
        accessToken: " "
      },
      executor
    );

    await expect(
      client.sendTemplate({
        to: "5511999998888",
        name: "boas_vindas",
        languageCode: "pt_BR"
      })
    ).rejects.toMatchObject({
      message:
        "ERR_CLOUD_API_ACCESS_TOKEN_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("requires phone number id before invoking executor", async () => {
    const executor = jest.fn();

    const client = new CloudApiClient(
      {
        ...credentials,
        phoneNumberId: " "
      },
      executor
    );

    await expect(
      client.sendTemplate({
        to: "5511999998888",
        name: "boas_vindas",
        languageCode: "pt_BR"
      })
    ).rejects.toMatchObject({
      message:
        "ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED"
    });

    expect(executor).not.toHaveBeenCalled();
  });

  it("preserves the existing generic Cloud API error contract", async () => {
    const executor = jest.fn().mockResolvedValue({
      statusCode: 400,
      body: JSON.stringify({
        error: {
          message: "Template rejected by upstream"
        }
      })
    });

    const client = new CloudApiClient(
      credentials,
      executor
    );

    await expect(
      client.sendTemplate({
        to: "5511999998888",
        name: "boas_vindas",
        languageCode: "pt_BR"
      })
    ).rejects.toMatchObject({
      message:
        expect.stringContaining(
          "ERR_CLOUD_API_REQUEST_FAILED"
        )
    });
  });
});