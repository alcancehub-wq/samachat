jest.mock("../../../services/TicketServices/ShowTicketService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../../models/OfficialInboundMessage", () => ({ __esModule: true, default: { findAll: jest.fn() } }));
jest.mock("../../../models/OfficialOutboundOrigin", () => ({ __esModule: true, default: { findAll: jest.fn() } }));

import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import OfficialInboundMessage from "../../../models/OfficialInboundMessage";
import OfficialOutboundOrigin from "../../../models/OfficialOutboundOrigin";
import ListTicketOfficialReplyConnectionsService from "../ListTicketOfficialReplyConnectionsService";

describe("ListTicketOfficialReplyConnectionsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ShowTicketService as jest.Mock).mockResolvedValue({ id: 9 });
  });

  it("returns the one factual official connection for the current ticket", async () => {
    (OfficialInboundMessage.findAll as jest.Mock).mockResolvedValue([
      { contextProviderMessageId: "wamid.outbound", deliveryWhatsappId: 7 }
    ]);
    (OfficialOutboundOrigin.findAll as jest.Mock).mockResolvedValue([
      { providerMessageId: "wamid.outbound", deliveryWhatsappId: 7 }
    ]);

    await expect(ListTicketOfficialReplyConnectionsService({
      ticketId: 9,
      accessData: { userId: 1, profile: "user" }
    })).resolves.toEqual([7]);
  });

  it("fails closed when there is no context correlation or more than one delivery connection", async () => {
    (OfficialInboundMessage.findAll as jest.Mock).mockResolvedValue([]);
    await expect(ListTicketOfficialReplyConnectionsService({
      ticketId: 9,
      accessData: { userId: 1, profile: "user" }
    })).resolves.toEqual([]);

    (OfficialInboundMessage.findAll as jest.Mock).mockResolvedValue([
      { contextProviderMessageId: "wamid.one", deliveryWhatsappId: 7 },
      { contextProviderMessageId: "wamid.two", deliveryWhatsappId: 8 }
    ]);
    (OfficialOutboundOrigin.findAll as jest.Mock).mockResolvedValue([
      { providerMessageId: "wamid.one", deliveryWhatsappId: 7 },
      { providerMessageId: "wamid.two", deliveryWhatsappId: 8 }
    ]);
    await expect(ListTicketOfficialReplyConnectionsService({
      ticketId: 9,
      accessData: { userId: 1, profile: "user" }
    })).resolves.toEqual([]);
  });
});