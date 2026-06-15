import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import { getScopedNotificationRoom, getScopedTicketsRoom } from "./socketRooms";

const SetTicketMessagesAsUnread = async (
  ticketId: string | number
): Promise<Ticket> => {
  const currentTicket = await ShowTicketService(ticketId);
  const nextUnreadMessages = Math.max(Number(currentTicket.unreadMessages) || 0, 1);


  const lastIncomingMessage = await Message.findOne({
    where: {
      ticketId: currentTicket.id,
      fromMe: false
    },
    order: [["createdAt", "DESC"]]
  });

  if (lastIncomingMessage) {
    await lastIncomingMessage.update({ read: false });
  }

  await currentTicket.update({ unreadMessages: nextUnreadMessages });

  const ticket = await ShowTicketService(ticketId);

  const io = getIO();
  io.to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId))
    .emit("ticket", {
      action: "update",
      ticket
    });

  return ticket;
};

export default SetTicketMessagesAsUnread;