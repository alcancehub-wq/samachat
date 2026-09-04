import api from "./api";

const findMatchingTicket = (tickets, contact, whatsappId) => {
  if (!Array.isArray(tickets) || !contact?.id) {
    return null;
  }

  const availableTickets =
    contact.allowMultipleConversations && whatsappId
      ? tickets.filter(ticket => Number(ticket.whatsappId) === Number(whatsappId))
      : tickets;

  return (
    availableTickets.find(ticket => Number(ticket.contactId) === Number(contact.id)) ||
    availableTickets.find(ticket => Number(ticket.contact?.id) === Number(contact.id)) ||
    availableTickets.find(
      ticket =>
        contact.number &&
        String(ticket.contact?.number || "") === String(contact.number)
    ) ||
    null
  );
};

const findExistingTicketByContact = async (contact, whatsappId) => {
  const searchParam = String(contact?.number || contact?.name || "").trim();

  if (!contact?.id || !searchParam) {
    return null;
  }

  for (const status of ["open", "pending"]) {
    const { data } = await api.get("/tickets", {
      params: { searchParam, status }
    });

    const matchingTicket = findMatchingTicket(data?.tickets, contact, whatsappId);

    if (matchingTicket) {
      return matchingTicket;
    }
  }

  return null;
};

export default findExistingTicketByContact;