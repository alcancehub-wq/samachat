import {
  ContactPayload,
  MessagePayload,
  WhatsappContextPayload
} from "../../handlers/handleWhatsappEvents";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface CloudMedia {
  id: string;
}

interface Request {
  normalizedMessage: {
    contactPayload: ContactPayload;
    messagePayload: MessagePayload;
    contextPayload: WhatsappContextPayload;
    cloudMedia?: CloudMedia;
  };
}

type ResultStatus =
  | "persisted"
  | "duplicate"
  | "contact_not_found"
  | "ticket_unresolved"
  | "media_unresolved";

interface Result {
  status: ResultStatus;
}

const ContactModel = Contact as any;
const TicketModel = Ticket as any;
const MessageModel = Message as any;

const ProcessCloudApiMessageEchoWebhook = async ({
  normalizedMessage
}: Request): Promise<Result> => {
  const { contactPayload, messagePayload, contextPayload } = normalizedMessage;

  if (normalizedMessage.cloudMedia) {
    return { status: "media_unresolved" };
  }

  const contact = await ContactModel.findOne({
    where: {
      number: contactPayload.number,
      isGroup: false
    }
  });

  if (!contact) {
    return { status: "contact_not_found" };
  }

  const tickets = await TicketModel.findAll({
    where: {
      contactId: contact.id,
      whatsappId: contextPayload.whatsappId
    }
  });

  if (tickets.length !== 1) {
    return { status: "ticket_unresolved" };
  }

  const existingMessage = await MessageModel.findByPk(messagePayload.id);
  if (existingMessage) {
    return { status: "duplicate" };
  }

  await CreateMessageService({
    messageData: {
      id: messagePayload.id,
      ticketId: tickets[0].id,
      body: messagePayload.body,
      fromMe: true,
      read: true,
      mediaType: messagePayload.type,
      ack: messagePayload.ack !== undefined ? messagePayload.ack : 0,
      createdAt: new Date(messagePayload.timestamp * 1000)
    },
    broadcastToTicketRoom: true,
    broadcastToStatus: false,
    broadcastToNotification: false
  });

  return { status: "persisted" };
};

export default ProcessCloudApiMessageEchoWebhook;