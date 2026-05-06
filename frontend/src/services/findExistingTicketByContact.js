import api from "./api";

const findMatchingTicket = (tickets, contact) => {
  if (!Array.isArray(tickets) || !contact?.id) {
    return null;
  }

  return (
    tickets.find(ticket => Number(ticket.contactId) === Number(contact.id)) ||
    tickets.find(ticket => Number(ticket.contact?.id) === Number(contact.id)) ||
    tickets.find(
      ticket =>
        contact.number &&
        String(ticket.contact?.number || "") === String(contact.number)
    ) ||
    null
  );
};

const findExistingTicketByContact = async contact => {
  const searchParam = String(contact?.number || contact?.name || "").trim();

  if (!contact?.id || !searchParam) {
    return null;
  }

  for (const status of ["open", "pending"]) {
    const { data } = await api.get("/tickets", {
      params: { searchParam, status }
    });

    const matchingTicket = findMatchingTicket(data?.tickets, contact);

    if (matchingTicket) {
      return matchingTicket;
    }
  }

  return null;
};

export default findExistingTicketByContact;