jest.mock("../../models/Contact", () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../models/Ticket", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
}));

jest.mock("../../models/Tag", () => ({
  findOne: jest.fn()
}));

jest.mock("../../models/TicketTag", () => ({
  destroy: jest.fn()
}));

jest.mock("../../libs/socket", () => ({
  getIO: jest.fn(() => {
    const io: any = {
      to: jest.fn(() => io),
      emit: jest.fn()
    };

    return io;
  })
}));

jest.mock("../../helpers/EmitContactEvent", () => jest.fn());
jest.mock("../../services/WbotServices/GetProfilePicUrl", () => jest.fn());
jest.mock("../../services/TicketServices/ShowTicketService", () => jest.fn());
jest.mock("../../services/MessageServices/CreateMessageService", () => jest.fn());
jest.mock("../../services/WhatsappService/ShowWhatsAppService", () => jest.fn());
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

import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import CreateMessageService from "../../services/MessageServices/CreateMessageService";
import ShowTicketService from "../../services/TicketServices/ShowTicketService";
import ShowWhatsAppService from "../../services/WhatsappService/ShowWhatsAppService";
import HandleIncomingFlowMessageService from "../../services/FlowExecutionServices/HandleIncomingFlowMessageService";
import { handleMessage } from "../handleWhatsappEvents";

const contactFindAllMock = Contact.findAll as jest.Mock;
const contactFindOneMock = Contact.findOne as jest.Mock;
const contactCreateMock = Contact.create as jest.Mock;
const ticketFindOneMock = Ticket.findOne as jest.Mock;
const ticketCreateMock = Ticket.create as jest.Mock;
const tagFindOneMock = Tag.findOne as jest.Mock;
const ticketTagDestroyMock = TicketTag.destroy as jest.Mock;
const createMessageServiceMock = CreateMessageService as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;
const showWhatsAppServiceMock = ShowWhatsAppService as jest.Mock;
const handleIncomingFlowMessageServiceMock =
  HandleIncomingFlowMessageService as jest.Mock;

const buildMessagePayload = (overrides: Record<string, unknown> = {}) => ({
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

const buildContactPayload = (overrides: Record<string, unknown> = {}) => ({
  name: "Juliana",
  number: "5511987654321",
  isGroup: false,
  ...overrides
});

const buildContextPayload = (overrides: Record<string, unknown> = {}) => ({
  whatsappId: 35,
  unreadMessages: 1,
  ...overrides
});

describe("handleWhatsappEvents manual contact echo flow", () => {
  let contactState: any[];
  let ticketState: any[];
  let messageState: any[];

  const attachUpdate = (
    target: any,
    updatedAt?: Date
  ): any => {
    target.update = jest.fn(async (data: Record<string, unknown>) => {
      Object.assign(target, data);

      if (updatedAt) {
        target.updatedAt = updatedAt;
      }

      return target;
    });

    return target;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const manualContact = attachUpdate({
      id: 17179,
      name: "Juliana",
      number: "5511987654321",
      lid: null,
      profilePicUrl: null,
      createdAt: new Date("2026-05-27T16:56:40.000Z"),
      updatedAt: new Date("2026-05-27T16:56:40.000Z")
    }, new Date("2026-05-27T16:56:57.000Z"));

    const manualTicket = attachUpdate({
      id: 1173,
      status: "open",
      contactId: 17179,
      unreadMessages: 0,
      userId: 16,
      queueId: 3,
      whatsappId: 35,
      pendingSince: null,
      updatedAt: new Date("2026-05-27T16:56:41.000Z"),
      queue: { id: 3 },
      contact: manualContact
    }, new Date("2026-05-27T16:57:00.000Z"));

    contactState = [manualContact];
    ticketState = [manualTicket];
    messageState = [];

    contactFindAllMock.mockImplementation(async ({ where }: any) => {
      const numbers = where?.number?.[Op.in] || [];

      return contactState
        .filter(contact => numbers.includes(contact.number))
        .sort((left, right) => left.id - right.id);
    });
    contactFindOneMock.mockResolvedValue(null);
    contactCreateMock.mockImplementation(async (data: Record<string, unknown>) => {
      const created = attachUpdate({
        id: contactState.length + 17179,
        ...data
      });
      contactState.push(created);
      return created;
    });

    ticketFindOneMock.mockImplementation(async ({ where }: any) => {
      const statuses = where?.status ? where.status[Op.or] : null;

      return (
        ticketState.find(ticket => {
          const sameContact = ticket.contactId === where.contactId;
          const sameWhatsapp = ticket.whatsappId === where.whatsappId;
          const statusMatches =
            !statuses || (Array.isArray(statuses) && statuses.includes(ticket.status));
          const updatedAtMatches =
            !where.updatedAt ||
            (ticket.updatedAt >= where.updatedAt[Op.between][0] &&
              ticket.updatedAt <= where.updatedAt[Op.between][1]);

          return sameContact && sameWhatsapp && statusMatches && updatedAtMatches;
        }) || null
      );
    });
    ticketCreateMock.mockImplementation(async (data: Record<string, unknown>) => {
      const created = attachUpdate({
        id: 2000 + ticketState.length,
        ...data,
        queue: data.queueId ? { id: data.queueId } : null
      });

      ticketState.push(created);
      return created;
    });

    tagFindOneMock.mockResolvedValue(null);
    ticketTagDestroyMock.mockResolvedValue(0);
    showTicketServiceMock.mockImplementation(async (ticketId: number) =>
      ticketState.find(ticket => ticket.id === ticketId)
    );
    showWhatsAppServiceMock.mockResolvedValue({
      queues: [],
      farewellMessage: ""
    });
    handleIncomingFlowMessageServiceMock.mockResolvedValue({ handled: false });
    createMessageServiceMock.mockImplementation(async ({ messageData }: any) => {
      messageState.push(messageData);
      return messageData;
    });
  });

  it("keeps the manual contact and ticket through the first outbound echo and the later inbound reply", async () => {
    await handleMessage(
      buildMessagePayload({
        id: "wamid-out-1",
        body: "Primeiro envio manual",
        fromMe: true,
        from: "5511888888888@c.us",
        to: "5511987654321@c.us"
      }) as any,
      buildContactPayload({
        number: "551187654321",
        profilePicUrl: "https://example.com/juliana.jpg"
      }) as any,
      buildContextPayload({ unreadMessages: 0 }) as any
    );

    await handleMessage(
      buildMessagePayload({
        id: "wamid-in-1",
        body: "Resposta do cliente",
        from: "551187654321@c.us",
        to: "5511888888888@c.us"
      }) as any,
      buildContactPayload({
        number: "551187654321",
        profilePicUrl: "https://example.com/juliana.jpg"
      }) as any,
      buildContextPayload({ unreadMessages: 1 }) as any
    );

    expect(contactCreateMock).not.toHaveBeenCalled();
    expect(ticketCreateMock).not.toHaveBeenCalled();
    expect(contactState).toHaveLength(1);
    expect(ticketState).toHaveLength(1);
    expect(contactState[0].number).toBe("5511987654321");
    expect(ticketState[0]).toEqual(
      expect.objectContaining({
        id: 1173,
        status: "open",
        userId: 16,
        queueId: 3,
        whatsappId: 35,
        contactId: 17179,
        unreadMessages: 1
      })
    );
    expect(messageState).toEqual([
      expect.objectContaining({
        id: "wamid-out-1",
        ticketId: 1173,
        body: "Primeiro envio manual",
        fromMe: true,
        contactId: undefined
      }),
      expect.objectContaining({
        id: "wamid-in-1",
        ticketId: 1173,
        body: "Resposta do cliente",
        fromMe: false,
        contactId: 17179
      })
    ]);
    expect(messageState.filter(message => message.ticketId === 1173)).toHaveLength(2);
    expect(showTicketServiceMock).toHaveBeenCalledWith(1173);
  });
});