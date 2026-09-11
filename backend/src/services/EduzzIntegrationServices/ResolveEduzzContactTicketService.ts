import { Transaction } from "sequelize";

import AppError from "../../errors/AppError";
import sequelize from "../../database";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import ResolveOperationalTicketService from "../TicketServices/ResolveOperationalTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
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
        if (existingTicket.userId && existingTicket.userId !== userId) {
          throw new AppError("ERR_EDUZZ_CONTACT_OWNED_BY_OTHER_USER", 409);
        }

        if (
          existingTicket.whatsappId &&
          existingTicket.whatsappId !== whatsappId
        ) {
          throw new AppError(
            "ERR_EDUZZ_CONTACT_OWNED_BY_OTHER_WHATSAPP",
            409
          );
        }

        if (!existingTicket.userId) {
          await existingTicket.update(
            {
              userId,
              whatsappId,
              status: "open",
              pendingSince: null
            },
            { transaction }
          );
        }

        return {
          ticketId: existingTicket.id,
          createdTicket: false
        };
      }

      const ticket = await Ticket.create(
        {
          contactId: lockedContact.id,
          whatsappId,
          userId,
          status: "open",
          isGroup: false,
          unreadMessages: 0
        },
        { transaction }
      );

      return {
        ticketId: ticket.id,
        createdTicket: true
      };
    }
  );

  const ticket = await ShowTicketService(resolution.ticketId);

  return {
    contact,
    ticket,
    createdTicket: resolution.createdTicket
  };
};

export default ResolveEduzzContactTicketService;
