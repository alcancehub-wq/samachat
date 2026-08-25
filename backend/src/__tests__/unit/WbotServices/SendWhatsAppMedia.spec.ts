import fs from "fs";
import SendWhatsAppMedia from "../../../services/WbotServices/SendWhatsAppMedia";
import Message from "../../../models/Message";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import { StartWhatsAppSession } from "../../../services/WbotServices/StartWhatsAppSession";
import { sleep } from "../../../utils/sleep";
import CloudApiClient from "../../../services/CloudApiServices/CloudApiClient";

jest.mock("../../../models/Message", () => ({
  findOne: jest.fn()
}));

jest.mock("../../../models/Whatsapp", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    hasSession: jest.fn(),
    isSessionReady: jest.fn(),
    checkNumber: jest.fn(),
    checkNumberLookup: jest.fn(),
    sendMedia: jest.fn()
  }
}));

jest.mock("../../../services/WbotServices/StartWhatsAppSession", () => ({
  StartWhatsAppSession: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../services/CloudApiServices/CloudApiClient", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../../services/Variables/ResolveMessageVariablesService", () =>
  jest.fn(({ template }: { template: string }) => ({ text: template }))
);

jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());
jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());

jest.mock("../../../services/WbotServices/audioNormalization", () => ({
  convertAudioToOgg: jest.fn(async (_path: string) => "tmp/converted.ogg"),
  convertAudioToMp3: jest.fn(async (_path: string) => "tmp/converted.mp3"),
  shouldNormalizeAudioForWhatsApp: jest.fn(() => false),
  shouldSendAudioAsVoice: jest.fn(() => false),
  WHATSAPP_COMPATIBLE_AUDIO_MIMETYPE: "audio/mpeg",
  WHATSAPP_VOICE_MIMETYPE: "audio/ogg;codecs=opus"
}));

jest.mock("../../../services/WbotServices/mediaDelivery", () => ({
  shouldSendMediaAsDocument: jest.fn(() => false)
}));

jest.mock("../../../utils/sleep", () => ({
  sleep: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe("SendWhatsAppMedia", () => {
  const findRecentMessageMock = Message.findOne as jest.Mock;
  const findByPkMock = Whatsapp.findByPk as jest.Mock;
  const hasSessionMock = whatsappProvider.hasSession as jest.Mock;
  const isSessionReadyMock = whatsappProvider.isSessionReady as jest.Mock;
  const checkNumberMock = whatsappProvider.checkNumber as jest.Mock;
  const checkNumberLookupMock = whatsappProvider.checkNumberLookup as jest.Mock;
  const sendMediaMock = whatsappProvider.sendMedia as jest.Mock;
  const startWhatsAppSessionMock = StartWhatsAppSession as jest.Mock;
  const sleepMock = sleep as jest.Mock;
  const cloudApiClientMock = CloudApiClient as unknown as jest.Mock;
  const uploadMediaMock = jest.fn();
  const sendCloudMediaMock = jest.fn();

  const whatsapp = {
    id: 35,
    status: "CONNECTED"
  } as any;

  const buildTicket = (overrides: Record<string, unknown> = {}) => ({
    id: 1001,
    whatsappId: 35,
    userId: 16,
    isGroup: false,
    contactId: 17162,
    user: { id: 16, name: "Bruna" },
    contact: {
      number: "5511999999999",
      lid: "",
      update: jest.fn().mockResolvedValue(undefined)
    },
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findByPkMock.mockResolvedValue(whatsapp);
    hasSessionMock.mockReturnValue(true);
    isSessionReadyMock.mockReturnValue(true);
    checkNumberMock.mockResolvedValue("");
    checkNumberLookupMock.mockResolvedValue({
      number: "",
      chatId: undefined,
      lid: undefined
    });
    findRecentMessageMock.mockResolvedValue(null);
    sleepMock.mockResolvedValue(undefined);

    const {
      shouldNormalizeAudioForWhatsApp,
      shouldSendAudioAsVoice
    } = jest.requireMock(
      "../../../services/WbotServices/audioNormalization"
    );

    const {
      shouldSendMediaAsDocument
    } = jest.requireMock(
      "../../../services/WbotServices/mediaDelivery"
    );

    shouldNormalizeAudioForWhatsApp.mockReturnValue(false);
    shouldSendAudioAsVoice.mockReturnValue(false);
    shouldSendMediaAsDocument.mockReturnValue(false);

    uploadMediaMock.mockReset();
    sendCloudMediaMock.mockReset();

    cloudApiClientMock.mockImplementation(() => ({
      uploadMedia: uploadMediaMock,
      sendMedia: sendCloudMediaMock
    }));
  });

  it("retries media send with lookup chat id when No LID is returned", async () => {
    const media = {
      filename: "file.pdf",
      originalname: "file.pdf",
      mimetype: "application/pdf",
      path: "tmp/file.pdf"
    } as Express.Multer.File;

    const ticket = buildTicket({
      contact: {
        number: "5511999999999",
        lid: "12345@lid",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    checkNumberLookupMock.mockResolvedValue({
      number: "5511999999999",
      chatId: "5511999999999@c.us",
      lid: "12345@lid"
    });

    sendMediaMock
      .mockRejectedValueOnce(new Error("No LID for user"))
      .mockResolvedValueOnce({ id: "msg-lookup", body: "", ack: 1 });

    await expect(
      SendWhatsAppMedia({ media, ticket: ticket as any })
    ).resolves.toMatchObject({ id: "msg-lookup", ack: 1 });

    expect(sendMediaMock).toHaveBeenCalledTimes(2);
    expect(sendMediaMock.mock.calls[0][1]).toBe("12345@lid");
    expect(sendMediaMock.mock.calls[1][1]).toBe("5511999999999@c.us");
  });

  it("skips retry when recorded audio echo is detected after provider error", async () => {
    const media = {
      filename: "recorded_1752680000000.webm",
      originalname: "recorded_1752680000000.webm",
      mimetype: "audio/webm;codecs=opus",
      path: "tmp/recorded_1752680000000.webm"
    } as Express.Multer.File;

    const ticket = buildTicket();

    const { shouldNormalizeAudioForWhatsApp } = jest.requireMock(
      "../../../services/WbotServices/audioNormalization"
    ) as {
      shouldNormalizeAudioForWhatsApp: jest.Mock;
    };
    shouldNormalizeAudioForWhatsApp.mockReturnValue(true);

    sendMediaMock.mockRejectedValueOnce(new Error("provider unknown failure"));
    findRecentMessageMock.mockResolvedValueOnce({
      id: "msg-recorded-echo",
      ticketId: 1001,
      mediaType: "audio",
      fromMe: true,
      createdAt: new Date()
    });

    await expect(SendWhatsAppMedia({ media, ticket: ticket as any })).resolves.toMatchObject({
      id: "msg-recorded-echo",
      fromMe: true,
      hasMedia: true,
      type: "audio",
      ack: 1
    });

    expect(sendMediaMock).toHaveBeenCalledTimes(1);
    expect(findRecentMessageMock).toHaveBeenCalledTimes(1);
    expect(startWhatsAppSessionMock).not.toHaveBeenCalled();
  });

  it("short-circuits recorded composer audio as accepted when no echo is detected", async () => {
    const media = {
      filename: "recorded_1752680000000.webm",
      originalname: "recorded_1752680000000.webm",
      mimetype: "audio/webm;codecs=opus",
      path: "tmp/recorded_1752680000000.webm"
    } as Express.Multer.File;

    const ticket = buildTicket();

    const { shouldNormalizeAudioForWhatsApp } = jest.requireMock(
      "../../../services/WbotServices/audioNormalization"
    ) as {
      shouldNormalizeAudioForWhatsApp: jest.Mock;
    };
    shouldNormalizeAudioForWhatsApp.mockReturnValue(true);

    sendMediaMock.mockRejectedValueOnce(new Error("provider unknown failure"));

    findRecentMessageMock.mockResolvedValue(null);

    await expect(SendWhatsAppMedia({ media, ticket: ticket as any })).resolves.toMatchObject({
      fromMe: true,
      hasMedia: true,
      type: "audio",
      ack: 1
    });

    expect(sendMediaMock).toHaveBeenCalledTimes(1);
    expect(startWhatsAppSessionMock).not.toHaveBeenCalled();
  });

  it("does not retry non-recorded media on generic provider errors to avoid duplicate delivery", async () => {
    const media = {
      filename: "audio.mp3",
      originalname: "audio.mp3",
      mimetype: "audio/mpeg",
      path: "tmp/audio.mp3"
    } as Express.Multer.File;

    const ticket = buildTicket();

    sendMediaMock.mockRejectedValueOnce(new Error("temporary failure"));

    await expect(
      SendWhatsAppMedia({ media, ticket: ticket as any })
    ).rejects.toMatchObject({ message: "ERR_SENDING_WAPP_MSG" });

    expect(sendMediaMock).toHaveBeenCalledTimes(1);
    expect(startWhatsAppSessionMock).not.toHaveBeenCalled();
  });

  it("preserves recorded uploaded file when preserveUploadedFile is true", async () => {
    const media = {
      filename: "recorded_1752680000000.webm",
      originalname: "recorded_1752680000000.webm",
      mimetype: "audio/webm;codecs=opus",
      path: "tmp/recorded_1752680000000.webm"
    } as Express.Multer.File;

    const ticket = buildTicket();
    const providerMessage = { id: "msg-preserve", body: "", ack: 1 };

    const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true as any);
    const unlinkSyncSpy = jest.spyOn(fs, "unlinkSync").mockImplementation(() => undefined as any);

    sendMediaMock.mockResolvedValueOnce(providerMessage);

    await expect(
      SendWhatsAppMedia({
        media,
        ticket: ticket as any,
        preserveUploadedFile: true
      })
    ).resolves.toEqual(providerMessage);

    expect(unlinkSyncSpy).not.toHaveBeenCalledWith(media.path);

    unlinkSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
  });

  it("removes uploaded file when preserveUploadedFile is false", async () => {
    const media = {
      filename: "recorded_1752680000000.webm",
      originalname: "recorded_1752680000000.webm",
      mimetype: "audio/webm;codecs=opus",
      path: "tmp/recorded_1752680000000.webm"
    } as Express.Multer.File;

    const ticket = buildTicket();
    const providerMessage = { id: "msg-remove", body: "", ack: 1 };

    const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true as any);
    const unlinkSyncSpy = jest.spyOn(fs, "unlinkSync").mockImplementation(() => undefined as any);

    sendMediaMock.mockResolvedValueOnce(providerMessage);

    await expect(
      SendWhatsAppMedia({
        media,
        ticket: ticket as any,
        preserveUploadedFile: false
      })
    ).resolves.toEqual(providerMessage);

    expect(unlinkSyncSpy).toHaveBeenCalledWith(media.path);

    unlinkSyncSpy.mockRestore();
    existsSyncSpy.mockRestore();
  });
  it("routes official media through Cloud API without legacy session or provider send", async () => {
    const media = {
      filename: "foto.jpg",
      originalname: "foto.jpg",
      mimetype: "image/jpeg",
      path: "tmp/foto.jpg"
    } as Express.Multer.File;

    const ticket = buildTicket();

    findByPkMock.mockResolvedValueOnce({
      id: 35,
      status: "CONNECTED",
      providerType: "official",
      accessToken: "official-token",
      phoneNumberId: "629748506897910",
      apiVersion: "v20.0",
      phoneNumber: "5511981901577"
    });

    uploadMediaMock.mockResolvedValueOnce({
      id: "meta-media-id-1"
    });

    sendCloudMediaMock.mockResolvedValueOnce({
      messages: [
        {
          id: "wamid.official-media-1"
        }
      ]
    });

    const readFileSyncSpy = jest
      .spyOn(fs, "readFileSync")
      .mockReturnValue(Buffer.from("fake-image") as any);

    const existsSyncSpy = jest
      .spyOn(fs, "existsSync")
      .mockReturnValue(true);

    const unlinkSyncSpy = jest
      .spyOn(fs, "unlinkSync")
      .mockImplementation(() => undefined as any);

    try {
      const result = await SendWhatsAppMedia({
        media,
        ticket: ticket as any,
        body: "Imagem oficial"
      });

      expect(cloudApiClientMock).toHaveBeenCalledTimes(1);

      expect(cloudApiClientMock).toHaveBeenCalledWith({
        accessToken: "official-token",
        phoneNumberId: "629748506897910",
        apiVersion: "v20.0"
      });

      expect(uploadMediaMock).toHaveBeenCalledTimes(1);

      expect(uploadMediaMock).toHaveBeenCalledWith({
        filename: "foto.jpg",
        mimetype: "image/jpeg",
        data: Buffer.from("fake-image")
      });

      expect(sendCloudMediaMock).toHaveBeenCalledTimes(1);

      expect(sendCloudMediaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "5511999999999",
          mediaId: "meta-media-id-1",
          type: "image"
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: "wamid.official-media-1",
          fromMe: true,
          hasMedia: true,
          type: "image",
          to: "5511999999999"
        })
      );

      expect(sendMediaMock).not.toHaveBeenCalled();
      expect(startWhatsAppSessionMock).not.toHaveBeenCalled();
      expect(hasSessionMock).not.toHaveBeenCalled();
      expect(isSessionReadyMock).not.toHaveBeenCalled();
    } finally {
      readFileSyncSpy.mockRestore();
      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    }
  });
});
