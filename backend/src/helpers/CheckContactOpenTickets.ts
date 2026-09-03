import AppError from "../errors/AppError";
import Contact from "../models/Contact";
import ResolveOperationalTicketService from "../services/TicketServices/ResolveOperationalTicketService";

const CheckContactOpenTickets = async (
  contactId: number,
  whatsappId: number,
  excludedTicketId?: number
): Promise<void> => {
  const contact = await Contact.findByPk(contactId);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const ticket = await ResolveOperationalTicketService({
    contactId,
    allowMultipleConversations: contact.allowMultipleConversations,
    whatsappId
  });

  if (ticket && ticket.id !== excludedTicketId) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }
};

export default CheckContactOpenTickets;
