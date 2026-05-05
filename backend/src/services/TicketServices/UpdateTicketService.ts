import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import ShowTicketService from "./ShowTicketService";
import { FOLLOW_UP_TAG_COLOR, FOLLOW_UP_TAG_NAME } from "../../utils/followUpTag";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
  tagIds?: number[];
  followUp?: boolean;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const { status, userId, queueId, whatsappId, tagIds, followUp } = ticketData;

  const ticket = await ShowTicketService(ticketId);
  await SetTicketMessagesAsRead(ticket);

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  await ticket.update({
    status,
    queueId,
    userId
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  let nextTagIds = tagIds;

  if (typeof followUp === "boolean") {
    const currentTagIds = ticket.tags?.map(tag => tag.id) || [];
    nextTagIds = Array.isArray(tagIds) ? [...tagIds] : [...currentTagIds];

    let followUpTag: Tag | null = null;

    if (followUp) {
      const [tag] = await Tag.findOrCreate({
        where: { name: FOLLOW_UP_TAG_NAME },
        defaults: {
          name: FOLLOW_UP_TAG_NAME,
          color: FOLLOW_UP_TAG_COLOR
        }
      });

      followUpTag = tag;
    } else {
      followUpTag = await Tag.findOne({
        where: { name: FOLLOW_UP_TAG_NAME }
      });
    }

    if (followUpTag) {
      const followUpTagId = followUpTag.id;

      if (followUp) {
        if (!nextTagIds.includes(followUpTagId)) {
          nextTagIds.push(followUpTagId);
        }
      } else {
        nextTagIds = nextTagIds.filter(tagId => tagId !== followUpTagId);
      }
    }
  }

  if (nextTagIds) {
    await ticket.$set("tags", Array.from(new Set(nextTagIds)));
  }

  await ticket.reload({ include: ["contact", "queue", "whatsapp", "user", "tags"] });

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
