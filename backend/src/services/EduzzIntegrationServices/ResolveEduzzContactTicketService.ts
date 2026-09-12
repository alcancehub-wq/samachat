import { Transaction } from "sequelize";

import AppError from "../../errors/AppError";
import sequelize from "../../database";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import ResolveOperationalTicketService from "../TicketServices/ResolveOperationalTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ValidateEduzzRuleOwnershipService from "./ValidateEduzzRuleOwnershipService";

interface Request {
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  userId: number;
  whatsappId: number;
}

interface Response {
  contact: Contact;
  ticket: Ticket;
  createdTicket: boolean;
}

const ResolveEduzzContactTicketService = async ({
  buyerName,
  buyerEmail,
  buyerPhone,
  userId,
  whatsappId
}: Request): Promise<Response> => {
  const number = String(buyerPhone || "").replace(/[^0-9]/g, "");

  if (!number) {
    throw new AppError("ERR_EDUZZ_BUYER_PHONE_MISSING", 422);
  }

  await ValidateEduzzRuleOwnershipService({
    userId,
    whatsappId
  });

  const contact = await CreateOrUpdateContactService({
    name: buyerName || number,
    number,
    email: buyerEmail || "",
    isGroup: false,
    whatsappId
  });

  const resolution = await sequelize.transaction(
    async (transaction: Transaction) => {
      const lockedContact = await Contact.findByPk(contact.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!lockedContact) {
        throw new AppError("ERR_NO_CONTACT_FOUND", 404);
      }

      const existingTicket = await ResolveOperationalTicketService({
        contactId: lockedContact.id,
        allowMultipleConversations: lockedContact.allowMultipleConversations,
        whatsappId,
        transaction
      });

      if (existingTicket) {
        return {
          ticketId: existingTicket.id,
          createdTicket: false,
          requiresTransfer:
            existingTicket.userId !== userId ||
            existingTicket.whatsappId !== whatsappId ||
            existingTicket.status !== "open"
        };
      }
      const targetUser = await User.findByPk(userId, {
        include: ["queues"],
        transaction
      });

      const queueId =
        targetUser?.queues?.length === 1
          ? targetUser.queues[0].id
          : undefined;

      const ticket = await Ticket.create(
        {
          contactId: lockedContact.id,
          whatsappId,
          userId,
          queueId,
          status: "open",
          isGroup: false,
          unreadMessages: 0
        },
        { transaction }
      );

      return {
        ticketId: ticket.id,
        createdTicket: true,
        requiresTransfer: false
      };
    }
  );

  if (resolution.requiresTransfer) {
    await UpdateTicketService({
      ticketId: resolution.ticketId,
      ticketData: {
        status: "open",
        userId,
        whatsappId,
        applyUserDefaultWhatsappOnTransfer: true
      }
    });
  }

  const ticket = await ShowTicketService(resolution.ticketId);

  return {
    contact,
    ticket,
    createdTicket: resolution.createdTicket
  };
};

export default ResolveEduzzContactTicketService;
