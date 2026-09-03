import AppError from "../../../errors/AppError";
import Ticket from "../../../models/Ticket";
import ResolveOperationalTicketService from "../ResolveOperationalTicketService";

jest.mock("../../../models/Ticket", () => ({
  findAll: jest.fn()
}));

const ticketFindAllMock = Ticket.findAll as jest.Mock;

describe("ResolveOperationalTicketService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("T01/T02: returns the only active ticket across connections when multiple conversations are disabled", async () => {
    const canonicalTicket = { id: 3192, whatsappId: 37, status: "open" };
    ticketFindAllMock.mockResolvedValue([canonicalTicket]);

    await expect(
      ResolveOperationalTicketService({
        contactId: 22356,
        allowMultipleConversations: false,
        whatsappId: 38
      })
    ).resolves.toBe(canonicalTicket);

    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ whatsappId: 38 })
      })
    );
  });

  it("T06: keeps connection-scoped resolution when multiple conversations are enabled", async () => {
    ticketFindAllMock.mockResolvedValue([{ id: 3212, whatsappId: 38, status: "pending" }]);

    await ResolveOperationalTicketService({
      contactId: 22356,
      allowMultipleConversations: true,
      whatsappId: 38
    });

    expect(ticketFindAllMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ whatsappId: 38 })
      })
    );
  });

  it("rejects legacy multi-active contact state without choosing a canonical ticket", async () => {
    ticketFindAllMock.mockResolvedValue([
      { id: 3192, whatsappId: 37, status: "open" },
      { id: 3212, whatsappId: 38, status: "pending" }
    ]);

    await expect(
      ResolveOperationalTicketService({
        contactId: 22356,
        allowMultipleConversations: false,
        whatsappId: 38
      })
    ).rejects.toEqual(new AppError("ERR_LEGACY_MULTI_ACTIVE_TICKETS", 409));
  });
});