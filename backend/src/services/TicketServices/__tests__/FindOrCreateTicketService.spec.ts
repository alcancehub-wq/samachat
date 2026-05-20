import Ticket from "../../../models/Ticket";
import FindOrCreateTicketService from "../FindOrCreateTicketService";
import ShowTicketService from "../ShowTicketService";

jest.mock("../../../models/Ticket", () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../ShowTicketService");

const ticketFindOneMock = Ticket.findOne as jest.Mock;
const showTicketServiceMock = ShowTicketService as jest.Mock;

describe("FindOrCreateTicketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(result).toEqual({ id: 55 });
  });
});