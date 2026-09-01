const mockProcessHistory = jest.fn();
const mockProcessMessageEcho = jest.fn();

jest.mock("../../models/Whatsapp", () => ({
  findByPk: jest.fn()
}));

jest.mock(
  "../../services/CloudApiWebhookServices/VerifyCloudApiSignature",
  () => ({
    __esModule: true,
    default: jest.fn()
  })
);

jest.mock(
  "../../services/CloudApiWebhookServices/NormalizeCloudApiWebhook",
  () => ({
    __esModule: true,
    default: jest.fn()
  })
);

jest.mock("../../services/CloudApiServices/CloudApiClient", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../handlers/handleWhatsappEvents", () => ({
  handleMessage: jest.fn()
}));

jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn()
  }
}));

jest.mock(
  "../../services/CloudApiWebhookServices/ProcessCloudApiHistoryWebhook",
  () => ({
    __esModule: true,
    default: mockProcessHistory
  }),
  { virtual: true }
);

jest.mock(
  "../../services/CloudApiWebhookServices/ProcessCloudApiMessageEchoWebhook",
  () => ({
    __esModule: true,
    default: mockProcessMessageEcho
  }),
  { virtual: true }
);

import { receive } from "../CloudApiWebhookController";
import Whatsapp from "../../models/Whatsapp";
import VerifyCloudApiSignature from "../../services/CloudApiWebhookServices/VerifyCloudApiSignature";
import NormalizeCloudApiWebhook from "../../services/CloudApiWebhookServices/NormalizeCloudApiWebhook";
import { handleMessage } from "../../handlers/handleWhatsappEvents";
import { logger } from "../../utils/logger";

const findByPkMock = Whatsapp.findByPk as jest.Mock;
const verifySignatureMock = VerifyCloudApiSignature as jest.Mock;
const normalizeMock = NormalizeCloudApiWebhook as jest.Mock;
const handleMessageMock = handleMessage as jest.Mock;
const loggerInfoMock = logger.info as jest.Mock;

const whatsappUpdateMock = jest.fn();

const buildResponse = () => {
  const sendMock = jest.fn().mockReturnValue("EVENT_RECEIVED");
  const statusMock = jest.fn().mockReturnValue({ send: sendMock });

  return {
    res: { status: statusMock } as any,
    sendMock,
    statusMock
  };
};

describe("CloudApiWebhookController coexistence history routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    whatsappUpdateMock.mockReset();
    delete process.env.CLOUD_API_HISTORY_CAPTURE;

    findByPkMock.mockResolvedValue({
      id: 35,
      providerType: "official",
      appSecret: "app-secret",
      accessToken: "official-token",
      phoneNumberId: "629748506897910",
      apiVersion: "v20.0",
      update: whatsappUpdateMock
    });

    verifySignatureMock.mockReturnValue(true);
    whatsappUpdateMock.mockResolvedValue(undefined);
    handleMessageMock.mockResolvedValue(undefined);
    mockProcessHistory.mockResolvedValue({ processed: 1 });
    mockProcessMessageEcho.mockResolvedValue({ status: "persisted" });
  });

  it("routes history outside the normal realtime pipeline", async () => {
    normalizeMock.mockReturnValue([]);

    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "history",
              value: {
                metadata: {
                  phone_number_id: "629748506897910"
                },
                history: []
              }
            }
          ]
        }
      ]
    };

    const req = {
      params: { whatsappId: "35" },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body
    } as any;

    const { res, statusMock, sendMock } = buildResponse();

    await receive(req, res);

    expect(verifySignatureMock).toHaveBeenCalled();
    expect(mockProcessHistory).toHaveBeenCalledTimes(1);
    expect(mockProcessHistory).toHaveBeenCalledWith({
      payload: body,
      whatsappId: 35
    });

    expect(normalizeMock).not.toHaveBeenCalled();
    expect(handleMessageMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledWith("EVENT_RECEIVED");
  });

  it("captures the raw envelope only for opted-in history changes", async () => {
    process.env.CLOUD_API_HISTORY_CAPTURE = "true";
    normalizeMock.mockReturnValue([]);

    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "history",
              value: {
                metadata: {
                  phone_number_id: "629748506897910"
                }
              }
            }
          ]
        }
      ]
    };
    const rawBody = Buffer.from(JSON.stringify(body));
    const req = {
      params: { whatsappId: "35" },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody,
      body
    } as any;
    const { res } = buildResponse();

    await receive(req, res);

    expect(loggerInfoMock).toHaveBeenCalledWith(
      {
        event: "cloud_api_history_webhook_capture",
        whatsappId: 35,
        payloadShape: {
          object: "string",
          entry: {
            type: "array",
            length: 1,
            items: {
              changes: {
                type: "array",
                length: 1,
                items: {
                  field: "string",
                  value: {
                    metadata: {
                      phone_number_id: "string"
                    }
                  }
                }
              }
            }
          }
        }
      },
      "Cloud API history webhook shape captured"
    );
    expect(JSON.stringify(loggerInfoMock.mock.calls)).not.toContain(
      rawBody.toString("utf8")
    );
    expect(normalizeMock).not.toHaveBeenCalled();
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it("keeps smb_message_echoes on the realtime pipeline", async () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "smb_message_echoes",
              value: {
                message_echoes: [
                  {
                    id: "wamid.echo.routing.1",
                    from: "5511981901577",
                    to: "553287072428",
                    timestamp: "1770000100",
                    type: "text",
                    text: {
                      body: "Mensagem nova do celular"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const normalizedEcho = {
      contactPayload: {
        name: "553287072428",
        number: "553287072428",
        isGroup: false
      },
      messagePayload: {
        id: "wamid.echo.routing.1",
        body: "Mensagem nova do celular",
        fromMe: true,
        hasMedia: false,
        type: "chat",
        timestamp: 1770000100,
        from: "5511981901577@c.us",
        to: "553287072428@c.us",
        ack: 0
      },
      contextPayload: {
        whatsappId: 35,
        unreadMessages: 0
      },
      isCoexistenceMessageEcho: true
    };

    normalizeMock.mockReturnValue([normalizedEcho]);

    const req = {
      params: { whatsappId: "35" },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body
    } as any;

    const { res } = buildResponse();

    await receive(req, res);

    expect(mockProcessHistory).not.toHaveBeenCalled();
    expect(normalizeMock).toHaveBeenCalledTimes(1);
    expect(normalizeMock).toHaveBeenCalledWith(body, 35);

    expect(mockProcessMessageEcho).toHaveBeenCalledWith({
      normalizedMessage: normalizedEcho
    });
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it("splits mixed history and realtime changes without losing either path", async () => {
    const historyChange = {
      field: "history",
      value: {
        metadata: {
          phone_number_id: "629748506897910"
        },
        history: []
      }
    };

    const echoChange = {
      field: "smb_message_echoes",
      value: {
        message_echoes: [
          {
            id: "wamid.echo.mixed.1",
            from: "5511981901577",
            to: "553287072428",
            timestamp: "1770000200",
            type: "text",
            text: {
              body: "Mensagem realtime em payload misto"
            }
          }
        ]
      }
    };

    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-test",
          changes: [historyChange, echoChange]
        }
      ]
    };

    const expectedHistoryPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-test",
          changes: [historyChange]
        }
      ]
    };

    const expectedRealtimePayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-test",
          changes: [echoChange]
        }
      ]
    };

    const normalizedEcho = {
      contactPayload: {
        name: "553287072428",
        number: "553287072428",
        isGroup: false
      },
      messagePayload: {
        id: "wamid.echo.mixed.1",
        body: "Mensagem realtime em payload misto",
        fromMe: true,
        hasMedia: false,
        type: "chat",
        timestamp: 1770000200,
        from: "5511981901577@c.us",
        to: "553287072428@c.us",
        ack: 0
      },
      contextPayload: {
        whatsappId: 35,
        unreadMessages: 0
      },
      isCoexistenceMessageEcho: true
    };

    normalizeMock.mockReturnValue([normalizedEcho]);

    const req = {
      params: { whatsappId: "35" },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body
    } as any;

    const { res } = buildResponse();

    await receive(req, res);

    expect(mockProcessHistory).toHaveBeenCalledTimes(1);
    expect(mockProcessHistory).toHaveBeenCalledWith({
      payload: expectedHistoryPayload,
      whatsappId: 35
    });

    expect(normalizeMock).toHaveBeenCalledTimes(1);
    expect(normalizeMock).toHaveBeenCalledWith(
      expectedRealtimePayload,
      35
    );

    expect(mockProcessMessageEcho).toHaveBeenCalledWith({
      normalizedMessage: normalizedEcho
    });
    expect(handleMessageMock).not.toHaveBeenCalled();
  });
});
