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

import Contact from "../../../models/Contact";
import Ticket from "../../../models/Ticket";
import Message from "../../../models/Message";
import { MessagePayload } from "../../../handlers/handleWhatsappEvents";
import CreateMessageService from "../../MessageServices/CreateMessageService";
import ProcessCloudApiMessageEchoWebhook from "../ProcessCloudApiMessageEchoWebhook";

const contactFindOneMock = Contact.findOne as jest.Mock;
const ticketFindAllMock = Ticket.findAll as jest.Mock;
const messageFindByPkMock = Message.findByPk as jest.Mock;
const createMessageServiceMock = CreateMessageService as jest.Mock;

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
    contactFindOneMock.mockResolvedValue({ id: 16 });
    ticketFindAllMock.mockResolvedValue([
      { id: 118, userId: 7, whatsappId: 35, contactId: 16 }
    ]);
    messageFindByPkMock.mockResolvedValue(null);
    createMessageServiceMock.mockResolvedValue(undefined);
  });

  it("persists a new echo with its provider WAMID and timestamp and emits only to its ticket room", async () => {
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
    expect(messageFindByPkMock).toHaveBeenCalledWith("wamid.coex.echo.persist.1");
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

  it("skips an existing WAMID without modifying it or emitting another socket event", async () => {
    messageFindByPkMock.mockResolvedValue({ id: messagePayload.id, ticketId: 118 });

    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: { name: "553287072428", number: "553287072428", isGroup: false },
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
        contactPayload: { name: "553287072428", number: "553287072428", isGroup: false },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    ticketFindAllMock.mockResolvedValueOnce([{ id: 118 }, { id: 119 }]);
    const ambiguousTicket = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: { name: "553287072428", number: "553287072428", isGroup: false },
        messagePayload,
        contextPayload: { whatsappId: 35, unreadMessages: 0 }
      }
    });

    expect(noContact).toEqual({ status: "contact_not_found" });
    expect(ambiguousTicket).toEqual({ status: "ticket_unresolved" });
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });

  it("skips echo media until a coexistence media contract is proven", async () => {
    const result = await ProcessCloudApiMessageEchoWebhook({
      normalizedMessage: {
        contactPayload: { name: "553287072428", number: "553287072428", isGroup: false },
        messagePayload: { ...messagePayload, hasMedia: true, type: "audio" },
        contextPayload: { whatsappId: 35, unreadMessages: 0 },
        cloudMedia: { id: "media-id" }
      }
    });

    expect(result).toEqual({ status: "media_unresolved" });
    expect(contactFindOneMock).not.toHaveBeenCalled();
    expect(createMessageServiceMock).not.toHaveBeenCalled();
  });
});