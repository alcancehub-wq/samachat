import { Op, Transaction } from "sequelize";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";

export const OPERATIONAL_TICKET_STATUSES = ["open", "pending"];

interface Request {
  contactId: number;
  allowMultipleConversations: boolean;
  whatsappId?: number;
  transaction?: Transaction;
}

const ResolveOperationalTicketService = async ({
  contactId,
  allowMultipleConversations,
  whatsappId,
  transaction
}: Request): Promise<Ticket | null> => {
  const where: any = {
    contactId,
    status: {
      [Op.in]: OPERATIONAL_TICKET_STATUSES
    }
  };

  if (allowMultipleConversations && whatsappId) {
    where.whatsappId = whatsappId;
  }

  const tickets = await Ticket.findAll({
    where,
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
    transaction
  });

  if (!allowMultipleConversations && tickets.length > 1) {
    throw new AppError("ERR_LEGACY_MULTI_ACTIVE_TICKETS", 409);
  }

  return tickets[0] || null;
};

export default ResolveOperationalTicketService;