import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import {
  getScopedNotificationRoom,
  getScopedTicketsRoom,
  getUserScopedNotificationRoom,
  getUserScopedTicketsRoom
} from "./socketRooms";

const SetTicketMessagesAsUnread = async (
  ticketId: string | number
): Promise<Ticket> => {
  const currentTicket = await ShowTicketService(ticketId);
  const nextUnreadMessages = Math.max(Number(currentTicket.unreadMessages) || 0, 1);

  await currentTicket.update({ unreadMessages: nextUnreadMessages });

  const ticket = await ShowTicketService(ticketId);

  const io = getIO();
  let broadcaster = io
    .to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId));

  if (ticket.userId) {
    broadcaster = broadcaster
      .to(getUserScopedTicketsRoom(ticket.status, ticket.userId))
      .to(getUserScopedNotificationRoom(ticket.userId));
  }

  broadcaster.emit("ticket", {
    action: "update",
    ticket
  });

  return ticket;
};

export default SetTicketMessagesAsUnread;