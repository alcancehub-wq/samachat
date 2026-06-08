import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { whatsappProvider } from "../../providers/WhatsApp";
import ShowTicketService, {
  TicketAccessData
} from "../TicketServices/ShowTicketService";

const DeleteWhatsAppMessage = async (
  messageId: string,
  accessData?: TicketAccessData
): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const ticket = accessData
    ? await ShowTicketService(message.ticketId, accessData)
    : message.ticket;

  if (!message.isInternal && !message.fromMe) {
    throw new AppError("ERR_DELETE_RECEIVED_MESSAGE_NOT_ALLOWED", 403);
  }

  if (message.isInternal) {
    await message.update({ isDeleted: true });
    return message;
  }

  const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

  await whatsappProvider.deleteMessage(
    ticket.whatsappId,
    chatId,
    message.id,
    message.fromMe
  );

  await message.update({ isDeleted: true });

  return message;
};

export default DeleteWhatsAppMessage;
