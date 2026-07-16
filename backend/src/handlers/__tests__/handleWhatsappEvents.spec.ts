jest.mock("../../services/ContactServices/CreateOrUpdateContactService", () => jest.fn());
jest.mock("../../services/TicketServices/FindOrCreateTicketService", () => jest.fn());
jest.mock("../../services/MessageServices/CreateMessageService", () => jest.fn());
jest.mock("../../services/WhatsappService/ShowWhatsAppService", () => jest.fn());
jest.mock("../../services/TicketServices/UpdateTicketService", () => jest.fn());
jest.mock("../../services/ContactServices/CreateContactService", () => jest.fn());
jest.mock("../../services/FlowExecutionServices/HandleIncomingFlowMessageService", () => jest.fn());
jest.mock("../../helpers/Mustache", () => jest.fn((value: string) => value));
jest.mock("../../providers/WhatsApp/whatsappProvider", () => ({
  whatsappProvider: {
    sendMessage: jest.fn()
  }
}));
jest.mock("../../utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));
jest.mock("../../libs/socket", () => {
  const io = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
  };

  return {
    getIO: jest.fn(() => io)
  };
});

import { handleMessage, MessagePayload, ContactPayload, WhatsappContextPayload } from "../handleWhatsappEvents";
import { handleMessageAck } from "../handleWhatsappEvents";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../../services/TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../../services/MessageServices/CreateMessageService";
import ShowWhatsAppService from "../../services/WhatsappService/ShowWhatsAppService";
import HandleIncomingFlowMessageService from "../../services/FlowExecutionServices/HandleIncomingFlowMessageService";
import Message from "../../models/Message";
import { logger } from "../../utils/logger";

const createOrUpdateContactServiceMock = CreateOrUpdateContactService as jest.MockedFunction<
  typeof CreateOrUpdateContactService
>;
const findOrCreateTicketServiceMock = FindOrCreateTicketService as jest.MockedFunction<
  typeof FindOrCreateTicketService
>;
const createMessageServiceMock = CreateMessageService as jest.MockedFunction<
  typeof CreateMessageService
>;
const showWhatsAppServiceMock = ShowWhatsAppService as jest.MockedFunction<
  typeof ShowWhatsAppService
>;
const handleIncomingFlowMessageServiceMock =
  HandleIncomingFlowMessageService as jest.MockedFunction<
    typeof HandleIncomingFlowMessageService
  >;
const loggerInfoMock = logger.info as jest.Mock;

const buildMessagePayload = (
  overrides: Partial<MessagePayload> = {}
): MessagePayload => ({
  id: "msg-1",
  body: "hello",
  fromMe: false,
  hasMedia: false,
  type: "chat",
  timestamp: Date.now(),
  from: "5511999999999@c.us",
  to: "5511888888888@c.us",
  hasQuotedMsg: false,
  ack: 0,
  ...overrides
});

const buildContactPayload = (
  overrides: Partial<ContactPayload> = {}
): ContactPayload => ({
  name: "Larissa",
  number: "5511999999999",
  isGroup: false,
  ...overrides
});

const buildContextPayload = (
  overrides: Partial<WhatsappContextPayload> = {}
): WhatsappContextPayload => ({
  whatsappId: 35,
  unreadMessages: 1,
  ...overrides
});

describe("handleWhatsappEvents group guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    showWhatsAppServiceMock.mockResolvedValue({
      queues: [],
      farewellMessage: ""
    } as any);
    handleIncomingFlowMessageServiceMock.mockResolvedValue({ handled: false } as any);
  });

  it("keeps inbound individual messages processing normally", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "pending",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: "msg-1" } as any);

    await handleMessage(
      buildMessagePayload(),
      buildContactPayload(),
      buildContextPayload()
    );

    expect(createOrUpdateContactServiceMock).toHaveBeenCalledTimes(1);
    expect(findOrCreateTicketServiceMock).toHaveBeenCalledWith(
      contact,
      35,
      1,
      undefined
    );
    expect(ticketUpdateMock).toHaveBeenCalledWith({ lastMessage: "hello" });
    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: "msg-1",
        ticketId: 118,
        contactId: 16,
        body: "hello",
        fromMe: false
      })
    });
  });

  it("ignores inbound group messages before creating contacts, tickets or messages", async () => {
    await handleMessage(
      buildMessagePayload({ from: "120363000000000000@g.us", to: "5511888888888@c.us" }),
      buildContactPayload(),
      buildContextPayload({
        isGroupMessage: true,
        groupContact: {
          name: "Equipe Comercial",
          number: "120363000000000000",
          isGroup: true
        }
      })
    );

    expect(createOrUpdateContactServiceMock).not.toHaveBeenCalled();
    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
    expect(showWhatsAppServiceMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsappId: 35,
        messageId: "msg-1",
        from: "120363000000000000@g.us"
      }),
      "Ignoring inbound WhatsApp group message"
    );
  });

  it("does not let a group participant fall into that participant's individual ticket", async () => {
    await handleMessage(
      buildMessagePayload({ from: "120363000000000000@g.us", to: "5511999999999@c.us" }),
      buildContactPayload({
        name: "Larissa",
        number: "5511999999999",
        isGroup: false
      }),
      buildContextPayload({
        isGroupMessage: true,
        groupContact: {
          name: "Grupo de Teste",
          number: "120363000000000000",
          isGroup: true
        }
      })
    );

    expect(createOrUpdateContactServiceMock).not.toHaveBeenCalled();
    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("keeps outbound individual messages processing normally", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "open",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: "msg-1" } as any);

    await handleMessage(
      buildMessagePayload({
        fromMe: true,
        from: "5511888888888@c.us",
        to: "5511999999999@c.us"
      }),
      buildContactPayload(),
      buildContextPayload({ unreadMessages: 0 })
    );

    expect(createOrUpdateContactServiceMock).toHaveBeenCalledTimes(1);
    expect(findOrCreateTicketServiceMock).toHaveBeenCalledTimes(1);
    expect(createMessageServiceMock).toHaveBeenCalledTimes(1);
    expect(handleIncomingFlowMessageServiceMock).not.toHaveBeenCalled();
  });

  it("ignores group messages fromMe so they do not contaminate individual tickets", async () => {
    await handleMessage(
      buildMessagePayload({
        fromMe: true,
        from: "120363000000000000@g.us",
        to: "120363000000000000@g.us"
      }),
      buildContactPayload({
        name: "Grupo de Teste",
        number: "120363000000000000",
        isGroup: true
      }),
      buildContextPayload({
        unreadMessages: 0,
        isGroupMessage: true
      })
    );

    expect(createOrUpdateContactServiceMock).not.toHaveBeenCalled();
    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("reuses the persisted outbound fallback id when provider echo arrives with a different id", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "open",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const duplicateCandidate = {
      id: "fallback_1784161342_unknown_554197837839@c.us_m1l2ms",
      createdAt: new Date(nowSeconds * 1000)
    } as any;

    jest
      .spyOn(Message, "findAll")
      .mockResolvedValue([duplicateCandidate] as any);

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: duplicateCandidate.id } as any);

    await handleMessage(
      buildMessagePayload({
        id: "3EB0REALPROVIDERID",
        body: "teste de duplicidade",
        fromMe: true,
        from: "5511888888888@c.us",
        to: "5511999999999@c.us",
        timestamp: nowSeconds
      }),
      buildContactPayload(),
      buildContextPayload({ unreadMessages: 0 })
    );

    expect(Message.findAll).toHaveBeenCalledTimes(1);
    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: duplicateCandidate.id,
        fromMe: true,
        body: "teste de duplicidade"
      })
    });
  });

  it("reuses the persisted wwebjs-accepted id when provider echo arrives with a different id", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "open",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const duplicateCandidate = {
      id: "wwebjs-accepted-35-1784161342000",
      createdAt: new Date(nowSeconds * 1000)
    } as any;

    jest
      .spyOn(Message, "findAll")
      .mockResolvedValue([duplicateCandidate] as any);

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: duplicateCandidate.id } as any);

    await handleMessage(
      buildMessagePayload({
        id: "3EB0REALPROVIDERID2",
        body: "teste de duplicidade accepted",
        fromMe: true,
        from: "5511888888888@c.us",
        to: "5511999999999@c.us",
        timestamp: nowSeconds
      }),
      buildContactPayload(),
      buildContextPayload({ unreadMessages: 0 })
    );

    expect(Message.findAll).toHaveBeenCalledTimes(1);
    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: duplicateCandidate.id,
        fromMe: true,
        body: "teste de duplicidade accepted"
      })
    });
  });

  it("matches wwebjs-accepted id on ack reconciliation when provider ack comes with real id", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const matchedMessage = {
      id: "wwebjs-accepted-35-1784161342000",
      ack: 1,
      ticketId: 118,
      createdAt: new Date(nowSeconds * 1000),
      update: updateMock
    } as any;

    jest
      .spyOn(Message, "findByPk")
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(matchedMessage);

    jest
      .spyOn(Message, "findAll")
      .mockResolvedValue([matchedMessage] as any);

    await handleMessageAck("3EB0REALACKID", 2 as any, {
      fromMe: true,
      body: "teste ack accepted",
      timestamp: nowSeconds
    });

    expect(Message.findAll).toHaveBeenCalledTimes(1);
    expect((Message.findByPk as jest.Mock).mock.calls[1][0]).toBe(
      matchedMessage.id
    );
    expect(updateMock).toHaveBeenCalledWith({ ack: 2 });
  });

  it("reuses serialized provider id when outbound echo arrives with raw id representation", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "open",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const duplicateCandidate = {
      id: "true_5511999999999@c.us_3EB0SERIALIZEDCASE",
      createdAt: new Date(nowSeconds * 1000)
    } as any;

    jest
      .spyOn(Message, "findAll")
      .mockResolvedValue([duplicateCandidate] as any);

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: duplicateCandidate.id } as any);

    await handleMessage(
      buildMessagePayload({
        id: "3EB0SERIALIZEDCASE",
        body: "teste serialized id",
        fromMe: true,
        from: "5511888888888@c.us",
        to: "5511999999999@c.us",
        timestamp: nowSeconds
      }),
      buildContactPayload(),
      buildContextPayload({ unreadMessages: 0 })
    );

    expect(Message.findAll).toHaveBeenCalledTimes(1);
    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: duplicateCandidate.id,
        fromMe: true,
        body: "teste serialized id"
      })
    });
  });

  it("reuses outbound candidate id when echo changes media type between ptt and audio", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "open",
      whatsappId: 35,
      queue: { id: 4 },
      userId: 16,
      update: ticketUpdateMock
    } as any;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const duplicateCandidate = {
      id: "wwebjs-accepted-35-1784161342999",
      createdAt: new Date(nowSeconds * 1000),
      mediaType: "ptt"
    } as any;

    jest.spyOn(Message, "findAll").mockResolvedValue([duplicateCandidate] as any);

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: duplicateCandidate.id } as any);

    await handleMessage(
      buildMessagePayload({
        id: "3EB0AUDIOPTTCASE",
        body: "",
        fromMe: true,
        type: "audio",
        from: "5511888888888@c.us",
        to: "5511999999999@c.us",
        timestamp: nowSeconds
      }),
      buildContactPayload(),
      buildContextPayload({ unreadMessages: 0 })
    );

    expect(Message.findAll).toHaveBeenCalledTimes(1);
    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: duplicateCandidate.id,
        fromMe: true,
        mediaType: "audio"
      })
    });
  });
});