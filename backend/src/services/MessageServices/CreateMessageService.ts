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
  createdAt?: Date;
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
  const existingMessage = await Message.findByPk(messageData.id);

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

  const action = existingMessage ? "update" : "create";
  const payload = {
    action,
    message,
    ticket: message.ticket,
    contact: message.ticket.contact
  };

  if (
    broadcastToTicketRoom ||
    broadcastToStatus ||
    broadcastToNotification
  ) {
    const io = getIO();

    if (broadcastToTicketRoom) {
      io.to(message.ticketId.toString()).emit("appMessage", payload);
    }

    if (broadcastToStatus || broadcastToNotification) {
      let broadcaster = io;
      const roomTargets = new Set<string>();

      if (broadcastToStatus) {
        roomTargets.add(getScopedTicketsRoom(message.ticket.status));
        roomTargets.add(
          getScopedTicketsRoom(message.ticket.status, message.ticket.whatsappId)
        );
      }

      if (broadcastToNotification) {
        roomTargets.add(getScopedNotificationRoom());
        roomTargets.add(
          getScopedNotificationRoom(message.ticket.whatsappId)
        );
      }

      roomTargets.forEach(room => {
        broadcaster = broadcaster.to(room);
      });

      if (roomTargets.size > 0) {
        broadcaster.emit("appMessage", payload);
      }
    }
  }

  return message;
};

export default CreateMessageService;
