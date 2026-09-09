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

const resolveMessageTicketIds = async (
  ticket: Ticket
): Promise<number[]> => {
  const primaryTicketId = Number(ticket.id);

  if (
    ticket.isGroup ||
    !ticket.contactId ||
    ticket.contact?.allowMultipleConversations
  ) {
    return [primaryTicketId];
  }

  const canonicalContactId =
    Number(ticket.contactId);

  if (!canonicalContactId) {
    return [primaryTicketId];
  }

  /*
   * P05 repair timeline:
   *
   * ShowTicketService remains the access-control anchor for the
   * currently opened ticket. Once access is authorized, messages
   * from historical tickets belonging to this exact Contact may
   * be rendered in one chronology.
   *
   * Message.ticketId is never changed here.
   */
  const historicalTickets =
    await Ticket.findAll({
      where: {
        contactId: canonicalContactId
      },
      attributes: ["id"],
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"]
      ]
    });

  const resolvedTicketIds =
    Array.from(
      new Set([
        primaryTicketId,
        ...historicalTickets
          .map(item => Number(item.id))
          .filter(Boolean)
      ])
    );

  if (resolvedTicketIds.length > 1) {
    logger.warn({
      info:
        "Listing messages with canonical contact history aggregation",
      ticketId: primaryTicketId,
      contactId: canonicalContactId,
      relatedTicketIds:
        resolvedTicketIds.filter(
          id => id !== primaryTicketId
        )
    });
  }

  return resolvedTicketIds;
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
