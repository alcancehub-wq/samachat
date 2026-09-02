jest.mock("../../../services/TicketServices/ShowTicketService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../../services/UserServices/ShowUserService", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../../services/OutboundChannelServices/ResolveOutboundChannelService", () => ({ __esModule: true, default: jest.fn() }));

import ShowTicketService from "../../../services/TicketServices/ShowTicketService";
import ShowUserService from "../../../services/UserServices/ShowUserService";
import ResolveOutboundChannelService from "../../../services/OutboundChannelServices/ResolveOutboundChannelService";
import SetTicketReplyOutboundChannelService from "../SetTicketReplyOutboundChannelService";

describe("SetTicketReplyOutboundChannelService", () => {
  const update = jest.fn();
  const ticket = {
    id: 9,
    whatsappId: 3,
    contactId: 4,
    userId: 5,
    queueId: 6,
    update
  };
  const accessData = { userId: 5, profile: "user" };

  beforeEach(() => {
    jest.clearAllMocks();
    (ShowTicketService as jest.Mock).mockResolvedValue(ticket);
  });

  it("persists STANDARD for only the requested ticket without changing ticket ownership fields", async () => {
    await SetTicketReplyOutboundChannelService({ ticketId: 9, replyOutboundMode: "STANDARD", accessData });

    expect(update).toHaveBeenCalledWith({ replyOutboundMode: "STANDARD", replyDeliveryWhatsappId: null });
    expect(ResolveOutboundChannelService).not.toHaveBeenCalled();
    expect(ticket).toMatchObject({ id: 9, whatsappId: 3, contactId: 4, userId: 5, queueId: 6 });
  });

  it("persists only a P01-authorized official connection for the requested ticket", async () => {
    (ShowUserService as jest.Mock).mockResolvedValue({ queues: [{ id: 6 }] });
    (ResolveOutboundChannelService as jest.Mock).mockResolvedValue({ whatsappId: 12 });

    await SetTicketReplyOutboundChannelService({
      ticketId: 9,
      replyOutboundMode: "OFFICIAL",
      replyDeliveryWhatsappId: 12,
      accessData
    });

    expect(ResolveOutboundChannelService).toHaveBeenCalledWith(expect.objectContaining({
      mode: "OFFICIAL",
      context: "ticketReply",
      ownerUserId: 5,
      actorQueueIds: [6],
      officialWhatsappId: 12
    }));
    expect(update).toHaveBeenCalledWith({ replyOutboundMode: "OFFICIAL", replyDeliveryWhatsappId: 12 });
    expect(ticket).toMatchObject({ id: 9, whatsappId: 3, contactId: 4, userId: 5, queueId: 6 });
  });
});