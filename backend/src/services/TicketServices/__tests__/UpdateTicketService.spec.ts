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

  beforeEach(() => {
    jest.clearAllMocks();
    toMock.mockReturnThis();
    getIOMock.mockReturnValue(ioMock);
    checkContactOpenTicketsMock.mockResolvedValue(undefined);
    setTicketMessagesAsReadMock.mockResolvedValue(undefined);
  });

  it("preserves manual reopen cleanup by removing only the Follow up tag", async () => {
    const ticketUpdateMock = jest.fn().mockResolvedValue(undefined);
    const ticketSetTagsMock = jest.fn().mockResolvedValue(undefined);
    const ticketReloadMock = jest.fn().mockImplementation(async () => {
      ticket.tags = [{ id: 8, name: "VIP" }];
    });
    const ticket: any = {
      id: 41,
      status: "closed",
      whatsappId: 13,
      pendingSince: null,
      user: { id: 3 },
      userId: 3,
      contactId: 99,
      contact: { id: 99 },
      tags: [
        { id: 7, name: "Follow up" },
        { id: 8, name: "VIP" }
      ],
      update: ticketUpdateMock,
      $set: ticketSetTagsMock,
      reload: ticketReloadMock
    };

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

    expect(ticketSetTagsMock).toHaveBeenCalledWith("tags", [8]);
    expect(ticketReloadMock).toHaveBeenCalledWith({
      include: ["contact", "queue", "whatsapp", "user", "tags"]
    });
    expect(result.ticket.tags).toEqual([{ id: 8, name: "VIP" }]);
  });
});