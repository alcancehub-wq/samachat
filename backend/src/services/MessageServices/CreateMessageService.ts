import { getIO } from "../../libs/socket";
import { getScopedNotificationRoom, getScopedTicketsRoom } from "../../helpers/socketRooms";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

interface MessageData {
  id: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  quotedMsgId?: string;
  isInternal?: boolean;
  senderName?: string;
}
interface Request {
  messageData: MessageData;
  broadcastToTicketRoom?: boolean;
  broadcastToStatus?: boolean;
  broadcastToNotification?: boolean;
}

const CreateMessageService = async ({
  messageData,
  broadcastToTicketRoom = true,
  broadcastToStatus = true,
  broadcastToNotification = true
}: Request): Promise<Message> => {
  await Message.upsert(messageData);

  const message = await Message.findByPk(messageData.id, {
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          "contact",
          "queue",
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["name"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();
  const payload = {
    action: "create",
    message,
    ticket: message.ticket,
    contact: message.ticket.contact
  };

  if (broadcastToTicketRoom) {
    io.to(message.ticketId.toString()).emit("appMessage", payload);
  }

  if (broadcastToStatus || broadcastToNotification) {
    let broadcaster = io;

    if (broadcastToStatus) {
      broadcaster = broadcaster.to(message.ticket.status);
      broadcaster = broadcaster.to(
        getScopedTicketsRoom(message.ticket.status, message.ticket.whatsappId)
      );
    }

    if (broadcastToNotification) {
      broadcaster = broadcaster.to("notification");
      broadcaster = broadcaster.to(
        getScopedNotificationRoom(message.ticket.whatsappId)
      );
    }

    broadcaster.emit("appMessage", payload);
  }

  return message;
};

export default CreateMessageService;
