import Ticket from "../../../models/Ticket";
import { getIO } from "../../../libs/socket";
import FindOrCreateTicketService from "../FindOrCreateTicketService";
import ShowTicketService from "../ShowTicketService";

jest.mock("../../../models/Ticket", () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../../libs/socket", () => ({
  getIO: jest.fn()
}));

jest.mock("../ShowTicketService");

const ticketFindOneMock = Ticket.findOne as jest.Mock;
const ticketCreateMock = Ticket.create as jest.Mock;
const getIOMock = getIO as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;

describe("FindOrCreateTicketService", () => {
  const emitMock = jest.fn();
  const toMock = jest.fn();
  const ioMock = {
    to: toMock,
    emit: emitMock
  };

  beforeEach(() => {
    jest.clearAllMocks();
    toMock.mockReturnThis();
    getIOMock.mockReturnValue(ioMock);
  });

  it("reuses open tickets only from the same whatsapp connection", async () => {
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    ticketFindOneMock.mockResolvedValue({
      id: 55,
      update: ticketUpdateMock
    });
    showTicketServiceMock.mockResolvedValue({ id: 55 });

    const result = await FindOrCreateTicketService(
      { id: 101 } as any,
      77,
      4
    );

    expect(ticketFindOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contactId: 101,
          whatsappId: 77
        })
      })
    );
    expect(ticketUpdateMock).toHaveBeenCalledWith({ unreadMessages: 4 });
    expect(showTicketServiceMock).toHaveBeenCalledWith(55);
    expect(emitMock).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 55 });
  });

  it("emits delete for the old closed room and update for pending when reopening automatically", async () => {
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    ticketFindOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 55,
        status: "closed",
        whatsappId: 77,
        update: ticketUpdateMock
      });
    showTicketServiceMock.mockResolvedValue({
      id: 55,
      status: "pending",
      whatsappId: 77,
      tags: [{ id: 9, name: "Follow up" }]
    });

    const result = await FindOrCreateTicketService(
      { id: 101 } as any,
      77,
      4
    );

    expect(ticketUpdateMock).toHaveBeenCalledWith({
      status: "pending",
      userId: null,
      unreadMessages: 4,
      pendingSince: expect.any(Date)
    });
    expect(toMock).toHaveBeenCalledWith("tickets:closed:whatsapp:77");
    expect(toMock).toHaveBeenCalledWith("tickets:pending:whatsapp:77");
    expect(toMock).toHaveBeenCalledWith("notification:whatsapp:77");
    expect(toMock).toHaveBeenCalledWith("55");
    expect(emitMock).toHaveBeenNthCalledWith(1, "ticket", {
      action: "delete",
      ticketId: 55
    });
    expect(emitMock).toHaveBeenNthCalledWith(2, "ticket", {
      action: "update",
      ticket: {
        id: 55,
        status: "pending",
        whatsappId: 77,
        tags: [{ id: 9, name: "Follow up" }]
      }
    });
    expect(result).toEqual({
      id: 55,
      status: "pending",
      whatsappId: 77,
      tags: [{ id: 9, name: "Follow up" }]
    });
  });

  it("preserves current behavior when creating a new ticket", async () => {
    ticketFindOneMock.mockResolvedValue(null);
    ticketCreateMock.mockResolvedValue({ id: 88 });
    showTicketServiceMock.mockResolvedValue({ id: 88, status: "pending" });

    const result = await FindOrCreateTicketService(
      { id: 101 } as any,
      77,
      4
    );

    expect(ticketCreateMock).toHaveBeenCalledWith({
      contactId: 101,
      status: "pending",
      isGroup: false,
      unreadMessages: 4,
      pendingSince: expect.any(Date),
      whatsappId: 77
    });
    expect(emitMock).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 88, status: "pending" });
  });

  it("emits the closed-room delete even when the ticket keeps the Follow up tag", async () => {
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    ticketFindOneMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 91,
        status: "closed",
        whatsappId: 13,
        tags: [{ id: 7, name: "Follow up" }],
        update: ticketUpdateMock
      });
    showTicketServiceMock.mockResolvedValue({
      id: 91,
      status: "pending",
      whatsappId: 13,
      tags: [{ id: 7, name: "Follow up" }]
    });

    await FindOrCreateTicketService(
      { id: 202 } as any,
      13,
      2
    );

    expect(ticketUpdateMock).toHaveBeenCalledWith({
      status: "pending",
      userId: null,
      unreadMessages: 2,
      pendingSince: expect.any(Date)
    });
    expect(emitMock).toHaveBeenNthCalledWith(1, "ticket", {
      action: "delete",
      ticketId: 91
    });
    expect(emitMock).toHaveBeenNthCalledWith(2, "ticket", {
      action: "update",
      ticket: {
        id: 91,
        status: "pending",
        whatsappId: 13,
        tags: [{ id: 7, name: "Follow up" }]
      }
    });
  });
});