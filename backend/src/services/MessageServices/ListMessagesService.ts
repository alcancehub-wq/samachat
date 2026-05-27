import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService, {
  TicketAccessData
} from "../TicketServices/ShowTicketService";
import { logger } from "../../utils/logger";

interface Request {
  ticketId: string;
  pageNumber?: string;
  accessData: TicketAccessData;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const resolveMessageTicketIds = async (ticket: Ticket): Promise<number[]> => {
  const primaryTicketId = Number(ticket.id);
  const primaryMessageCount = await Message.count({
    where: { ticketId: primaryTicketId }
  });

  if (primaryMessageCount > 0) {
    return [primaryTicketId];
  }

  if (ticket.isGroup || !ticket.whatsappId || !ticket.contactId) {
    return [primaryTicketId];
  }

  const currentNumber = ticket.contact?.number || "";
  const numberCandidates = BuildEquivalentContactNumberCandidates(currentNumber);

  if (numberCandidates.length < 2) {
    return [primaryTicketId];
  }

  const equivalentContacts = await Contact.findAll({
    where: {
      number: {
        [Op.in]: numberCandidates
      }
    },
    attributes: ["id"],
    order: [["createdAt", "ASC"], ["id", "ASC"]]
  });

  const equivalentContactIds = equivalentContacts
    .map(contact => Number(contact.id))
    .filter(contactId => contactId && contactId !== Number(ticket.contactId));

  if (!equivalentContactIds.length) {
    return [primaryTicketId];
  }

  const fallbackTickets = await Ticket.findAll({
    where: {
      id: {
        [Op.ne]: primaryTicketId
      },
      contactId: {
        [Op.in]: equivalentContactIds
      },
      whatsappId: ticket.whatsappId,
      status: "pending",
      userId: null,
      queueId: null
    },
    attributes: ["id", "contactId"],
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  const fallbackTicketIds = fallbackTickets
    .map(relatedTicket => Number(relatedTicket.id))
    .filter(Boolean);

  if (!fallbackTicketIds.length) {
    return [primaryTicketId];
  }

  const fallbackMessageCount = await Message.count({
    where: {
      ticketId: {
        [Op.in]: fallbackTicketIds
      }
    }
  });

  if (!fallbackMessageCount) {
    return [primaryTicketId];
  }

  logger.warn({
    info: "Listing messages with equivalent pending ticket fallback",
    ticketId: primaryTicketId,
    fallbackTicketIds,
    numberCandidates
  });

  return [primaryTicketId, ...fallbackTicketIds];
};

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  accessData
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId, accessData);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);
  const resolvedTicketIds = await resolveMessageTicketIds(ticket);
  const messageWhere =
    resolvedTicketIds.length === 1
      ? { ticketId: resolvedTicketIds[0] }
      : {
          ticketId: {
            [Op.in]: resolvedTicketIds
          }
        };

  const { count, rows: messages } = await Message.findAndCountAll({
    where: messageWhere,
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    offset,
    order: [["createdAt", "DESC"], ["id", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
