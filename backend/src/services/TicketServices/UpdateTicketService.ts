import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import ShowTicketService, { TicketAccessData } from "./ShowTicketService";
import { FOLLOW_UP_TAG_COLOR, FOLLOW_UP_TAG_NAME } from "../../utils/followUpTag";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
  tagIds?: number[];
  followUp?: boolean;
  applyUserDefaultWhatsappOnTransfer?: boolean;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  accessData?: TicketAccessData;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  accessData
}: Request): Promise<Response> => {
  const {
    status,
    userId,
    queueId,
    whatsappId,
    tagIds,
    followUp,
    applyUserDefaultWhatsappOnTransfer
  } = ticketData;

  const ticket = await ShowTicketService(ticketId, accessData);
  await SetTicketMessagesAsRead(ticket);

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  let nextWhatsappId = whatsappId;
  const hasExplicitWhatsappSelection =
    !!whatsappId && whatsappId !== ticket.whatsappId;

  if (
    applyUserDefaultWhatsappOnTransfer &&
    userId &&
    userId !== oldUserId &&
    !hasExplicitWhatsappSelection
  ) {
    const userWhatsapp = await GetDefaultWhatsAppByUser(userId);

    if (userWhatsapp) {
      nextWhatsappId = userWhatsapp.id;
    }
  }

  if (nextWhatsappId && ticket.whatsappId !== nextWhatsappId) {
    await CheckContactOpenTickets(ticket.contactId, nextWhatsappId);
  }

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  const nextStatus = status || oldStatus;

  await ticket.update({
    status,
    queueId,
    userId,
    pendingSince:
      nextStatus === "pending" && oldStatus !== "pending"
        ? new Date()
        : ticket.pendingSince
  });

  if (nextWhatsappId) {
    await ticket.update({
      whatsappId: nextWhatsappId
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
