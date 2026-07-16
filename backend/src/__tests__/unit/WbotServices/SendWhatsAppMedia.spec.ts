import SendWhatsAppMedia from "../../../services/WbotServices/SendWhatsAppMedia";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import { StartWhatsAppSession } from "../../../services/WbotServices/StartWhatsAppSession";
import { sleep } from "../../../utils/sleep";

jest.mock("../../../models/Whatsapp", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    hasSession: jest.fn(),
    isSessionReady: jest.fn(),
    checkNumber: jest.fn(),
    sendMedia: jest.fn()
  }
}));

jest.mock("../../../services/WbotServices/StartWhatsAppSession", () => ({
  StartWhatsAppSession: jest.fn().mockResolvedValue(undefined)
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
  const findByPkMock = Whatsapp.findByPk as jest.Mock;
  const hasSessionMock = whatsappProvider.hasSession as jest.Mock;
  const isSessionReadyMock = whatsappProvider.isSessionReady as jest.Mock;
  const checkNumberMock = whatsappProvider.checkNumber as jest.Mock;
  const sendMediaMock = whatsappProvider.sendMedia as jest.Mock;
  const startWhatsAppSessionMock = StartWhatsAppSession as jest.Mock;
  const sleepMock = sleep as jest.Mock;

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
    sleepMock.mockResolvedValue(undefined);
  });

  it("keeps retry behavior for recorded composer audio on generic provider errors", async () => {
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

    const providerMessage = { id: "msg-recorded", body: "", ack: 1 };
    sendMediaMock
      .mockRejectedValueOnce(new Error("provider unknown failure"))
      .mockResolvedValueOnce(providerMessage);

    await expect(
      SendWhatsAppMedia({ media, ticket: ticket as any })
    ).resolves.toEqual(providerMessage);

    expect(sendMediaMock).toHaveBeenCalledTimes(2);
    expect(startWhatsAppSessionMock).toHaveBeenCalled();
  });

  it("keeps retry behavior for non-recorded media on generic provider errors", async () => {
    const media = {
      filename: "audio.mp3",
      originalname: "audio.mp3",
      mimetype: "audio/mpeg",
      path: "tmp/audio.mp3"
    } as Express.Multer.File;

    const ticket = buildTicket();

    const providerMessage = { id: "msg-1", body: "", ack: 1 };
    sendMediaMock
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(providerMessage);

    await expect(
      SendWhatsAppMedia({ media, ticket: ticket as any })
    ).resolves.toEqual(providerMessage);

    expect(sendMediaMock).toHaveBeenCalledTimes(2);
    expect(startWhatsAppSessionMock).toHaveBeenCalled();
  });
});
