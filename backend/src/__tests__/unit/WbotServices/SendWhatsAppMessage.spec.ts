import AppError from "../../../errors/AppError";
import CheckContactOpenTickets from "../../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../../helpers/GetDefaultWhatsApp";
import formatBody from "../../../helpers/Mustache";
import Whatsapp from "../../../models/Whatsapp";
import { whatsappProvider } from "../../../providers/WhatsApp";
import CheckNumber from "../../../services/WbotServices/CheckNumber";
import SendWhatsAppMessage from "../../../services/WbotServices/SendWhatsAppMessage";
import { StartWhatsAppSession } from "../../../services/WbotServices/StartWhatsAppSession";
import ResolveMessageVariablesService from "../../../services/Variables/ResolveMessageVariablesService";
import { logger } from "../../../utils/logger";
import { sleep } from "../../../utils/sleep";

jest.mock("../../../models/Whatsapp", () => ({
  findByPk: jest.fn()
}));

jest.mock("../../../providers/WhatsApp", () => ({
  whatsappProvider: {
    hasSession: jest.fn(),
    isSessionReady: jest.fn(),
    isSessionActive: jest.fn(),
    checkNumber: jest.fn(),
    sendMessage: jest.fn()
  }
}));

jest.mock("../../../helpers/Mustache", () => jest.fn((body: string) => body));
jest.mock(
  "../../../services/Variables/ResolveMessageVariablesService",
  () => jest.fn(({ template }: { template: string }) => ({ text: template }))
);
jest.mock("../../../services/WbotServices/StartWhatsAppSession", () => ({
  StartWhatsAppSession: jest.fn().mockResolvedValue(undefined)
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
jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/GetDefaultWhatsApp", () => jest.fn());
jest.mock("../../../services/WbotServices/CheckNumber", () => jest.fn());

describe("SendWhatsAppMessage", () => {
  const findByPkMock = Whatsapp.findByPk as jest.Mock;
  const hasSessionMock = whatsappProvider.hasSession as jest.Mock;
  const isSessionReadyMock = whatsappProvider.isSessionReady as jest.Mock;
  const sendMessageMock = whatsappProvider.sendMessage as jest.Mock;
  const checkNumberServiceMock = CheckNumber as jest.Mock;
  const startWhatsAppSessionMock = StartWhatsAppSession as jest.Mock;
  const loggerWarnMock = logger.warn as jest.Mock;
  const sleepMock = sleep as jest.Mock;
  const checkContactOpenTicketsMock = CheckContactOpenTickets as jest.Mock;
  const getDefaultWhatsAppMock = GetDefaultWhatsApp as jest.Mock;
  const formatBodyMock = formatBody as jest.Mock;
  const resolveMessageVariablesServiceMock =
    ResolveMessageVariablesService as jest.Mock;

  const whatsapp = {
    id: 35,
    status: "CONNECTED",
    phoneNumber: "5511981901577"
  };

  const buildTicket = (overrides: Record<string, unknown> = {}) => {
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const contactUpdateMock = jest.fn().mockResolvedValue(undefined);

    return {
      id: 1161,
      whatsappId: 35,
      userId: 16,
      contactId: 17162,
      isGroup: false,
      user: { id: 16, name: "Larissa" },
      contact: {
        number: "5511963715316",
        lid: "",
        update: contactUpdateMock
      },
      update: ticketUpdateMock,
      ...overrides
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findByPkMock.mockResolvedValue(whatsapp);
    hasSessionMock.mockReturnValue(true);
    isSessionReadyMock.mockReturnValue(true);
    checkContactOpenTicketsMock.mockResolvedValue(undefined);
    getDefaultWhatsAppMock.mockResolvedValue(whatsapp);
    resolveMessageVariablesServiceMock.mockImplementation(
      ({ template }: { template: string }) => ({ text: template })
    );
    checkNumberServiceMock.mockResolvedValue("5511963715316");
    formatBodyMock.mockImplementation((body: string) => body);
    sleepMock.mockResolvedValue(undefined);
  });

  it("keeps the ticket 1161 control-positive flow sending normally", async () => {
    const ticket = buildTicket({
      id: 1161,
      contactId: 17162,
      contact: {
        number: "5511963715316",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });
    const providerMessage = { id: "msg-1161" };

    sendMessageMock.mockResolvedValue(providerMessage);

    await expect(
      SendWhatsAppMessage({ body: "controle positivo", ticket })
    ).resolves.toEqual(providerMessage);

    expect(sendMessageMock).toHaveBeenCalledWith(
      35,
      "5511963715316@c.us",
      "controle positivo",
      expect.objectContaining({
        linkPreview: false,
        quotedMessageId: undefined,
        quotedMessageFromMe: undefined
      })
    );
    expect(ticket.update).toHaveBeenCalledWith({
      lastMessage: "controle positivo"
    });
    expect(checkNumberServiceMock).not.toHaveBeenCalled();
  });

  it("retries Juliana with the rich lookup chat id when the first send fails with No LID for user", async () => {
    const ticket = buildTicket({
      id: 1153,
      contactId: 17160,
      contact: {
        number: "5599984396105",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });
    const providerMessage = { id: "msg-1153" };

    sendMessageMock
      .mockRejectedValueOnce(new Error("No LID for user"))
      .mockResolvedValueOnce(providerMessage);
    checkNumberServiceMock.mockResolvedValue({
      number: "5599984396105",
      chatId: "179473865519257@lid",
      jid: "179473865519257@lid",
      lid: "179473865519257@lid",
      serializedId: "179473865519257@lid"
    });

    await expect(
      SendWhatsAppMessage({ body: "regressao 1153", ticket })
    ).resolves.toEqual(providerMessage);

    expect(checkNumberServiceMock).toHaveBeenCalledWith("5599984396105", {
      whatsappId: 35,
      returnLookupResult: true
    });
    expect(sendMessageMock).toHaveBeenNthCalledWith(
      1,
      35,
      "5599984396105@c.us",
      "regressao 1153",
      expect.any(Object)
    );
    expect(sendMessageMock).toHaveBeenNthCalledWith(
      2,
      35,
      "179473865519257@lid",
      "regressao 1153",
      expect.any(Object)
    );
    expect(ticket.update).toHaveBeenCalledWith({
      lastMessage: "regressao 1153"
    });
  });

  it("keeps the ticket 1153 lookup inconclusive error out of ERR_WAPP_INVALID_CONTACT", async () => {
    const ticket = buildTicket({
      id: 1153,
      contactId: 17160,
      contact: {
        number: "5599984396105",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    sendMessageMock.mockRejectedValue(new Error("No LID for user"));
    checkNumberServiceMock.mockResolvedValue({
      number: "",
      chatId: undefined,
      jid: undefined,
      lid: undefined,
      serializedId: undefined
    });

    await expect(
      SendWhatsAppMessage({ body: "regressao 1153", ticket })
    ).rejects.toMatchObject({
      message: "ERR_WAPP_CHECK_CONTACT"
    });

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flow: "messages",
        ticketId: 1153,
        whatsappId: 35,
        number: "5599984396105",
        candidates: ["5599984396105"]
      }),
      "SendWhatsAppMessage lookup returned no confirmed number"
    );
  });

  it("avoids retrying the same phone chat id when the lookup cannot improve the destination", async () => {
    const ticket = buildTicket({
      id: 1153,
      contactId: 17160,
      contact: {
        number: "5599984396105",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    sendMessageMock.mockRejectedValue(new Error("No LID for user"));
    checkNumberServiceMock.mockResolvedValue({
      number: "5599984396105",
      chatId: "5599984396105@c.us",
      jid: "5599984396105@c.us",
      serializedId: "5599984396105@c.us"
    });

    await expect(
      SendWhatsAppMessage({ body: "mesmo destino", ticket })
    ).rejects.toMatchObject({
      message: "ERR_WAPP_CHECK_CONTACT"
    });

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it("still blocks explicit provider negatives as invalid contacts", async () => {
    const ticket = buildTicket({
      id: 1153,
      contactId: 17160,
      contact: {
        number: "5599984396105",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    sendMessageMock.mockRejectedValue(new Error("No LID for user"));
    checkNumberServiceMock.mockRejectedValue(
      new AppError("ERR_NUMBER_NOT_ON_WHATSAPP", 404)
    );

    await expect(
      SendWhatsAppMessage({ body: "numero invalido", ticket })
    ).rejects.toMatchObject({
      message: "ERR_WAPP_INVALID_CONTACT"
    });
  });

  it("preserves connection-not-ready errors instead of turning them into invalid contacts", async () => {
    const ticket = buildTicket({
      id: 1153,
      contactId: 17160,
      contact: {
        number: "5599984396105",
        lid: "",
        update: jest.fn().mockResolvedValue(undefined)
      }
    });

    hasSessionMock.mockReturnValue(false);
    isSessionReadyMock.mockReturnValue(false);

    await expect(
      SendWhatsAppMessage({ body: "sessao indisponivel", ticket })
    ).rejects.toMatchObject({
      message: "ERR_WAPP_NOT_INITIALIZED"
    });

    expect(startWhatsAppSessionMock).toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});