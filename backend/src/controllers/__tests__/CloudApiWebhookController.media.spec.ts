import { receive } from "../CloudApiWebhookController";
import Whatsapp from "../../models/Whatsapp";
import VerifyCloudApiSignature from "../../services/CloudApiWebhookServices/VerifyCloudApiSignature";
import NormalizeCloudApiWebhook from "../../services/CloudApiWebhookServices/NormalizeCloudApiWebhook";
import CloudApiClient from "../../services/CloudApiServices/CloudApiClient";
import {
  handleMessage,
  handleMessageAck
} from "../../handlers/handleWhatsappEvents";

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
  handleMessage: jest.fn(),
  handleMessageAck: jest.fn()
}));

describe("CloudApiWebhookController inbound media", () => {
  const findByPkMock = Whatsapp.findByPk as jest.Mock;
  const verifySignatureMock = VerifyCloudApiSignature as jest.Mock;
  const normalizeMock = NormalizeCloudApiWebhook as jest.Mock;
  const cloudClientMock = CloudApiClient as unknown as jest.Mock;
  const handleMessageMock = handleMessage as jest.Mock;
  const handleMessageAckMock = handleMessageAck as jest.Mock;

  const retrieveMediaMock = jest.fn();
  const downloadMediaMock = jest.fn();
  const whatsappUpdateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    retrieveMediaMock.mockReset();
    downloadMediaMock.mockReset();
    whatsappUpdateMock.mockReset();

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

    cloudClientMock.mockImplementation(() => ({
      retrieveMedia: retrieveMediaMock,
      downloadMedia: downloadMediaMock
    }));

    whatsappUpdateMock.mockResolvedValue(undefined);
    handleMessageMock.mockResolvedValue(undefined);
    handleMessageAckMock.mockResolvedValue(undefined);
  });

  const receiveStatusWebhook = async (statuses: unknown[]) => {
    normalizeMock.mockReturnValue([]);

    const req = {
      params: { whatsappId: "35" },
      headers: { "x-hub-signature-256": "sha256=test" },
      rawBody: Buffer.from("{}"),
      body: {
        object: "whatsapp_business_account",
        entry: [{ changes: [{ field: "messages", value: { statuses } }] }]
      }
    } as any;
    const sendMock = jest.fn().mockReturnValue("EVENT_RECEIVED");
    const statusMock = jest.fn().mockReturnValue({ send: sendMock });

    await receive(req, { status: statusMock } as any);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledWith("EVENT_RECEIVED");
  };

  it.each([
    ["sent", 1],
    ["delivered", 2],
    ["read", 3]
  ])("promotes Cloud API %s status by WAMID", async (status, ack) => {
    await receiveStatusWebhook([
      { id: "wamid.status.1", status }
    ]);

    expect(handleMessageAckMock).toHaveBeenCalledWith(
      "wamid.status.1",
      ack
    );
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it.each(["failed", "deleted", "unknown"]) (
    "skips non-promoting Cloud API status %s",
    async status => {
      await receiveStatusWebhook([
        { id: "wamid.status.1", status }
      ]);

      expect(handleMessageAckMock).not.toHaveBeenCalled();
      expect(handleMessageMock).not.toHaveBeenCalled();
    }
  );

  it("skips a Cloud API status without WAMID", async () => {
    await receiveStatusWebhook([{ status: "delivered" }]);

    expect(handleMessageAckMock).not.toHaveBeenCalled();
    expect(handleMessageMock).not.toHaveBeenCalled();
  });

  it("processes statuses and inbound messages in the same webhook", async () => {
    normalizeMock.mockReturnValue([
      {
        contactPayload: { name: "Cliente", number: "5511999999999", isGroup: false },
        messagePayload: { id: "wamid.inbound.1", body: "Ola", fromMe: false },
        contextPayload: { whatsappId: 35, unreadMessages: 1 }
      }
    ]);

    const req = {
      params: { whatsappId: "35" },
      headers: { "x-hub-signature-256": "sha256=test" },
      rawBody: Buffer.from("{}"),
      body: {
        entry: [{
          changes: [{
            field: "messages",
            value: { statuses: [{ id: "wamid.status.2", status: "delivered" }] }
          }]
        }]
      }
    } as any;

    await receive(req, { status: jest.fn().mockReturnValue({ send: jest.fn() }) } as any);

    expect(handleMessageAckMock).toHaveBeenCalledWith("wamid.status.2", 2);
    expect(handleMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "wamid.inbound.1" }),
      expect.any(Object),
      expect.any(Object),
      undefined
    );
  });

  it("downloads inbound official audio and forwards MediaPayload to handleMessage", async () => {
    normalizeMock.mockReturnValue([
      {
        contactPayload: {
          name: "Cliente Audio",
          number: "5511999999999",
          isGroup: false
        },
        messagePayload: {
          id: "wamid.audio.inbound",
          body: "",
          fromMe: false,
          hasMedia: true,
          type: "audio",
          timestamp: 1770000000,
          from: "5511999999999@c.us",
          to: "629748506897910@c.us",
          ack: 0
        },
        contextPayload: {
          whatsappId: 35,
          unreadMessages: 1
        },
        cloudMedia: {
          id: "meta-media-audio-1",
          type: "audio",
          mimetype: "audio/ogg"
        }
      }
    ]);

    retrieveMediaMock.mockResolvedValue({
      id: "meta-media-audio-1",
      url: "https://lookaside.fbsbx.com/audio-1",
      mime_type: "audio/ogg"
    });

    downloadMediaMock.mockResolvedValue({
      data: Buffer.from("fake-audio-binary"),
      mimetype: "audio/ogg"
    });

    const req = {
      params: {
        whatsappId: "35"
      },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body: {
        object: "whatsapp_business_account"
      }
    } as any;

    const sendMock = jest.fn().mockReturnValue("EVENT_RECEIVED");
    const statusMock = jest.fn().mockReturnValue({
      send: sendMock
    });

    const res = {
      status: statusMock
    } as any;

    await receive(req, res);

    expect(cloudClientMock).toHaveBeenCalledWith({
      accessToken: "official-token",
      phoneNumberId: "629748506897910",
      apiVersion: "v20.0"
    });

    expect(retrieveMediaMock).toHaveBeenCalledWith(
      "meta-media-audio-1"
    );

    expect(downloadMediaMock).toHaveBeenCalledWith(
      "https://lookaside.fbsbx.com/audio-1"
    );

    expect(handleMessageMock).toHaveBeenCalledTimes(1);

    expect(handleMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.audio.inbound",
        hasMedia: true,
        type: "audio"
      }),
      expect.objectContaining({
        number: "5511999999999"
      }),
      {
        whatsappId: 35,
        unreadMessages: 1
      },
      {
        filename: "",
        mimetype: "audio/ogg",
        data: Buffer.from("fake-audio-binary").toString("base64")
      }
    );

    expect(whatsappUpdateMock).toHaveBeenCalledWith({
      cloudApiStatus: "message_received",
      cloudApiLastError: null
    });

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(sendMock).toHaveBeenCalledWith("EVENT_RECEIVED");
  });

  it("preserves official text path without creating CloudApiClient media download", async () => {
    normalizeMock.mockReturnValue([
      {
        contactPayload: {
          name: "Cliente Texto",
          number: "5511888888888",
          isGroup: false
        },
        messagePayload: {
          id: "wamid.text.inbound",
          body: "Texto continua funcionando",
          fromMe: false,
          hasMedia: false,
          type: "chat",
          timestamp: 1770000001,
          from: "5511888888888@c.us",
          to: "629748506897910@c.us",
          ack: 0
        },
        contextPayload: {
          whatsappId: 35,
          unreadMessages: 1
        }
      }
    ]);

    const req = {
      params: {
        whatsappId: "35"
      },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body: {}
    } as any;

    const sendMock = jest.fn().mockReturnValue("EVENT_RECEIVED");
    const statusMock = jest.fn().mockReturnValue({
      send: sendMock
    });

    const res = {
      status: statusMock
    } as any;

    await receive(req, res);

    expect(cloudClientMock).not.toHaveBeenCalled();
    expect(retrieveMediaMock).not.toHaveBeenCalled();
    expect(downloadMediaMock).not.toHaveBeenCalled();

    expect(handleMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "wamid.text.inbound",
        body: "Texto continua funcionando",
        hasMedia: false,
        type: "chat"
      }),
      expect.any(Object),
      {
        whatsappId: 35,
        unreadMessages: 1
      },
      undefined
    );
  });

  it("rejects media event when Meta metadata does not return a URL", async () => {
    normalizeMock.mockReturnValue([
      {
        contactPayload: {
          name: "Cliente",
          number: "5511777777777",
          isGroup: false
        },
        messagePayload: {
          id: "wamid.audio.no-url",
          body: "",
          fromMe: false,
          hasMedia: true,
          type: "audio",
          timestamp: 1770000002,
          from: "5511777777777@c.us",
          to: "629748506897910@c.us",
          ack: 0
        },
        contextPayload: {
          whatsappId: 35,
          unreadMessages: 1
        },
        cloudMedia: {
          id: "meta-media-no-url",
          type: "audio"
        }
      }
    ]);

    retrieveMediaMock.mockResolvedValue({
      id: "meta-media-no-url",
      mime_type: "audio/ogg"
    });

    const req = {
      params: {
        whatsappId: "35"
      },
      headers: {
        "x-hub-signature-256": "sha256=test"
      },
      rawBody: Buffer.from("{}"),
      body: {}
    } as any;

    const res = {
      status: jest.fn()
    } as any;

    await expect(
      receive(req, res)
    ).rejects.toMatchObject({
      message: "ERR_CLOUD_API_MEDIA_URL_REQUIRED"
    });

    expect(downloadMediaMock).not.toHaveBeenCalled();
    expect(handleMessageMock).not.toHaveBeenCalled();
  });
});