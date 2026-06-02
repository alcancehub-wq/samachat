import Tag from "../../../models/Tag";
import { getIO } from "../../../libs/socket";
import CheckContactOpenTickets from "../../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../../helpers/SetTicketMessagesAsRead";
import UpdateTicketService from "../UpdateTicketService";
import ShowTicketService from "../ShowTicketService";

jest.mock("../../../models/Tag", () => ({
  findOne: jest.fn(),
  findOrCreate: jest.fn()
}));

jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn()
}));

jest.mock("../../../helpers/CheckContactOpenTickets", () => jest.fn());
jest.mock("../../../helpers/SetTicketMessagesAsRead", () => jest.fn());
jest.mock("../../WbotServices/SendWhatsAppMessage", () => jest.fn());
jest.mock("../../WhatsappService/ShowWhatsAppService", () => jest.fn());
jest.mock("../../../helpers/GetDefaultWhatsAppByUser", () => jest.fn());
jest.mock("../ShowTicketService", () => jest.fn());

const tagFindOneMock = Tag.findOne as jest.Mock;
const getIOMock = getIO as jest.Mock;
const checkContactOpenTicketsMock = CheckContactOpenTickets as jest.Mock;
const setTicketMessagesAsReadMock = SetTicketMessagesAsRead as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;

describe("UpdateTicketService", () => {
  const emitMock = jest.fn();
  const toMock = jest.fn();
  const ioMock = {
    to: toMock,
    emit: emitMock
  };

  const buildTicket = (overrides: Partial<any> = {}) => {
    let ticket: any;

    ticket = {
      id: 41,
      status: "open",
      whatsappId: 13,
      pendingSince: null,
      lostAt: null,
      user: { id: 3 },
      userId: 3,
      contactId: 99,
      contact: { id: 99 },
      tags: [],
      update: jest.fn().mockImplementation(async payload => {
        Object.assign(ticket, payload);
      }),
      $set: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined),
      ...overrides
    };

    return ticket;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toMock.mockReturnThis();
    getIOMock.mockReturnValue(ioMock);
    checkContactOpenTicketsMock.mockResolvedValue(undefined);
    setTicketMessagesAsReadMock.mockResolvedValue(undefined);
  });

  it("preserves manual reopen cleanup by removing only the Follow up tag", async () => {
    const ticket = buildTicket({
      status: "closed",
      tags: [
        { id: 7, name: "Follow up" },
        { id: 8, name: "VIP" }
      ]
    });

    ticket.reload = jest.fn().mockImplementation(async () => {
      ticket.tags = [{ id: 8, name: "VIP" }];
    });

    showTicketServiceMock.mockResolvedValue(ticket);
    tagFindOneMock.mockResolvedValue({ id: 7, name: "Follow up" });

    const result = await UpdateTicketService({
      ticketId: 41,
      ticketData: {
        status: "open",
        userId: 3,
        followUp: false
      }
    });

    expect(ticket.$set).toHaveBeenCalledWith("tags", [8]);
    expect(ticket.reload).toHaveBeenCalledWith({
      include: ["contact", "queue", "whatsapp", "user", "tags"]
    });
    expect(result.ticket.tags).toEqual([{ id: 8, name: "VIP" }]);
  });

  it("fills lostAt when marking an open ticket as lost", async () => {
    const pendingSince = new Date("2026-06-01T10:00:00.000Z");
    const ticket = buildTicket({ status: "open", lostAt: null, pendingSince });

    showTicketServiceMock.mockResolvedValue(ticket);

    const result = await UpdateTicketService({
      ticketId: 41,
      ticketData: {
        status: "lost",
        userId: 3
      }
    });

    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "lost",
        userId: 3,
        lostAt: expect.any(Date),
        pendingSince
      })
    );
    expect(result.ticket.status).toBe("lost");
    expect(result.ticket.lostAt).toBeInstanceOf(Date);
  });

  it("fills lostAt when marking a pending ticket as lost", async () => {
    const pendingSince = new Date("2026-06-01T09:00:00.000Z");
    const ticket = buildTicket({
      status: "pending",
      user: null,
      userId: null,
      pendingSince,
      lostAt: null
    });

    showTicketServiceMock.mockResolvedValue(ticket);

    await UpdateTicketService({
      ticketId: 41,
      ticketData: {
        status: "lost",
        userId: 5
      }
    });

    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "lost",
        userId: 5,
        lostAt: expect.any(Date),
        pendingSince
      })
    );
  });

  it("clears lostAt when reopening a lost ticket", async () => {
    const ticket = buildTicket({
      status: "lost",
      lostAt: new Date("2026-06-01T08:00:00.000Z")
    });

    showTicketServiceMock.mockResolvedValue(ticket);

    const result = await UpdateTicketService({
      ticketId: 41,
      ticketData: {
        status: "open",
        userId: 9,
        followUp: false
      }
    });

    expect(ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "open",
        userId: 9,
        lostAt: null
      })
    );
    expect(result.ticket.status).toBe("open");
    expect(result.ticket.lostAt).toBeNull();
  });
});