import AppError from "../../errors/AppError";
import ResolveOutboundChannelService from "../OutboundChannelServices/ResolveOutboundChannelService";
import ShowUserService from "../UserServices/ShowUserService";
import ShowTicketService, { TicketAccessData } from "./ShowTicketService";

interface Request {
  ticketId: string | number;
  replyOutboundMode: "STANDARD" | "OFFICIAL";
  replyDeliveryWhatsappId?: number | null;
  accessData: TicketAccessData;
}

const SetTicketReplyOutboundChannelService = async ({
  ticketId,
  replyOutboundMode,
  replyDeliveryWhatsappId,
  accessData
}: Request) => {
  const ticket = await ShowTicketService(ticketId, accessData);

  if (replyOutboundMode === "STANDARD") {
    await ticket.update({ replyOutboundMode: "STANDARD", replyDeliveryWhatsappId: null });
    return ticket;
  }

  if (replyOutboundMode !== "OFFICIAL") {
    throw new AppError("ERR_OUTBOUND_CHANNEL_MODE_INVALID", 400);
  }

  const actor = await ShowUserService(accessData.userId);
  const actorQueueIds = (actor.queues || []).map(queue => Number(queue.id));
  const channel = await ResolveOutboundChannelService({
    mode: "OFFICIAL",
    context: "ticketReply",
    ownerUserId: Number(accessData.userId),
    actorProfile: accessData.profile,
    actorQueueIds,
    officialWhatsappId: replyDeliveryWhatsappId
  });

  await ticket.update({
    replyOutboundMode: "OFFICIAL",
    replyDeliveryWhatsappId: channel.whatsappId
  });

  return ticket;
};

export default SetTicketReplyOutboundChannelService;