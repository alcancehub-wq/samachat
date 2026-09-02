jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  default: { findOne: jest.fn() }
}));

jest.mock("../../../models/Ticket", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

jest.mock("../../../models/Message", () => ({
  __esModule: true,
  default: { findByPk: jest.fn() }
}));

jest.mock("../../MessageServices/CreateMessageService", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../../TicketServices/FindOrCreateTicketService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import Message from "../../../models/Message";
import { MessagePayload } from "../../../handlers/handleWhatsappEvents";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../../TicketServices/FindOrCreateTicketService";
import ProcessCloudApiMessageEchoWebhook from "../ProcessCloudApiMessageEchoWebhook";

const contactFindOneMock = (Contact as any).findOne as jest.Mock;
const ticketFindAllMock = (Ticket as any).findAll as jest.Mock;
const messageFindByPkMock = (Message as any).findByPk as jest.Mock;
const createMessageServiceMock = CreateMessageService as jest.Mock;
const findOrCreateTicketServiceMock = FindOrCreateTicketService as jest.Mock;

const contact = { id: 16 };

const messagePayload: MessagePayload = {
  id: "wamid.coex.echo.persist.1",
  body: "Resposta pelo celular",
  fromMe: true,
  hasMedia: false,
  type: "chat",
  timestamp: 1770000100,
  from: "5511981901577@c.us",
  to: "553287072428@c.us",
  ack: 0
};

describe("ProcessCloudApiMessageEchoWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    contactFindOneMock.mockResolvedValue(contact);

    ticketFindAllMock.mockResolvedValue([
      { id: 118, userId: 7, whatsappId: 35, contactId: 16 }
    ]);

    findOrCreateTicketServiceMock.mockResolvedValue({
      id: 220,
      userId: null,
      queueId: null,
      status: "pending",
      whatsappId: 35,
      contactId: 16
    });

    messageFindByPkMock.mockResolvedValue(null);
    createMessageServiceMock.mockResolvedValue(undefined);
  });

  it("persists a new echo with its provider WAMID and timestamp and emits only to its existing ticket room", async () => {
    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    expect(result).toEqual({ status: "persisted" });

    expect(contactFindOneMock).toHaveBeenCalledWith({
      where: { number: "553287072428", isGroup: false }
    });

    expect(ticketFindAllMock).toHaveBeenCalledWith({
      where: { contactId: 16, whatsappId: 35 }
    });

    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();

    expect(messageFindByPkMock).toHaveBeenCalledWith(
      "wamid.coex.echo.persist.1"
    );

    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: "wamid.coex.echo.persist.1",
        ticketId: 118,
        fromMe: true,
        read: true,
        createdAt: new Date(1770000100 * 1000)
      }),
      broadcastToTicketRoom: true,
      broadcastToStatus: false,
      broadcastToNotification: false
    });
  });

  it("creates a pending ticket for a real coexistence echo when the contact has no ticket on the official connection", async () => {
    ticketFindAllMock.mockResolvedValueOnce([]);

    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    expect(result).toEqual({ status: "persisted" });

    expect(findOrCreateTicketServiceMock).toHaveBeenCalledTimes(1);

    expect(findOrCreateTicketServiceMock).toHaveBeenCalledWith(
      contact,
      35,
      0
    );

    expect(createMessageServiceMock).toHaveBeenCalledWith({
      messageData: expect.objectContaining({
        id: "wamid.coex.echo.persist.1",
        ticketId: 220,
        fromMe: true,
        read: true,
        createdAt: new Date(1770000100 * 1000)
      }),
      broadcastToTicketRoom: true,
      broadcastToStatus: true,
      broadcastToNotification: false
    });
  });

  it("skips an existing WAMID without modifying it or emitting another socket event", async () => {
    messageFindByPkMock.mockResolvedValue({
      id: messagePayload.id,
      ticketId: 118
    });

    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    expect(result).toEqual({ status: "duplicate" });
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("skips when the contact is absent or ticket association is ambiguous", async () => {
    contactFindOneMock.mockResolvedValueOnce(null);

    const noContact = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    ticketFindAllMock.mockResolvedValueOnce([
      { id: 118 },
      { id: 119 }
    ]);

    const ambiguousTicket = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    expect(noContact).toEqual({
      status: "contact_not_found"
    });

    expect(ambiguousTicket).toEqual({
      status: "ticket_unresolved"
    });

    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("skips echo media until a coexistence media contract is proven", async () => {
    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: {
          name: "553287072428",
          number: "553287072428",
          isGroup: false
        },
        messagePayload: {
          ...messagePayload,
          hasMedia: true,
          type: "audio"
        },
        contextPayload: { whatsappId: 35, unreadMessages: 0 },
        cloudMedia: { id: "media-id" }
      }
    });

    expect(result).toEqual({
      status: "media_unresolved"
    });

    expect(contactFindOneMock).not.toHaveBeenCalled();
    expect(findOrCreateTicketServiceMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });
});
