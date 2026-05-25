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

import { handleMessage, MessagePayload, ContactPayload, WhatsappContextPayload } from "../handleWhatsappEvents";
import CreateOrUpdateContactService from "../../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../../services/TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../../services/MessageServices/CreateMessageService";
import ShowWhatsAppService from "../../services/WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../../services/TicketServices/UpdateTicketService";
import HandleIncomingFlowMessageService from "../../services/FlowExecutionServices/HandleIncomingFlowMessageService";
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
const updateTicketServiceMock = UpdateTicketService as jest.MockedFunction<
  typeof UpdateTicketService
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

  it("keeps queue routing active even when the pending ticket already has an owner", async () => {
    const contact = { id: 16, name: "Larissa" } as any;
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticket = {
      id: 118,
      status: "pending",
      whatsappId: 35,
      queue: null,
      userId: 16,
      user: { id: 16 },
      update: ticketUpdateMock
    } as any;

    createOrUpdateContactServiceMock.mockResolvedValue(contact);
    findOrCreateTicketServiceMock.mockResolvedValue(ticket);
    createMessageServiceMock.mockResolvedValue({ id: "msg-1" } as any);
    showWhatsAppServiceMock.mockResolvedValue({
      queues: [{ id: 4, name: "Comercial" }],
      greetingMessage: ""
    } as any);

    await handleMessage(
      buildMessagePayload(),
      buildContactPayload(),
      buildContextPayload()
    );

    expect(updateTicketServiceMock).toHaveBeenCalledWith({
      ticketData: { queueId: 4 },
      ticketId: 118
    });
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
});