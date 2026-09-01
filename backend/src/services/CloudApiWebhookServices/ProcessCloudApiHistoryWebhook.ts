import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import CreateMessageService from "../MessageServices/CreateMessageService";

interface CloudApiHistoryMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
}

interface CloudApiHistoryChange {
  field?: string;
  value?: {
    history?: Array<{
      threads?: Array<{
        id?: string;
        messages?: CloudApiHistoryMessage[];
      }>;
    }>;
  };
}

interface CloudApiHistoryEntry {
  id?: string;
  changes?: CloudApiHistoryChange[];
}

interface CloudApiHistoryPayload {
  object?: string;
  entry?: CloudApiHistoryEntry[];
}

interface Request {
  payload: CloudApiHistoryPayload;
  whatsappId: number;
}

interface Result {
  recognizedHistoryChanges: number;
  persistedMessages: number;
  skippedMessages: number;
}

const ContactModel = Contact as any;
const TicketModel = Ticket as any;
const MessageModel = Message as any;

const ProcessCloudApiHistoryWebhook = async ({
  payload,
  whatsappId
}: Request): Promise<Result> => {
  if (!whatsappId || Number.isNaN(whatsappId)) {
    throw new Error("ERR_CLOUD_API_HISTORY_INVALID_WHATSAPP_ID");
  }

  let historyChanges = 0;
  let persistedMessages = 0;
  let skippedMessages = 0;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "history") {
        historyChanges += 1;

        for (const history of change.value?.history || []) {
          for (const thread of history.threads || []) {
            if (!thread.id) {
              skippedMessages += (thread.messages || []).length;
              continue;
            }

            const contact = await ContactModel.findOne({
              where: { number: thread.id, isGroup: false }
            });
            if (!contact) {
              skippedMessages += (thread.messages || []).length;
              continue;
            }

            const tickets = await TicketModel.findAll({
              where: { contactId: contact.id, whatsappId }
            });
            if (tickets.length !== 1) {
              skippedMessages += (thread.messages || []).length;
              continue;
            }

            for (const message of thread.messages || []) {
              const timestamp = Number(message.timestamp || 0);
              const isText =
                message.type === "text" &&
                typeof message.text?.body === "string";
              if (!message.id || !timestamp || Number.isNaN(timestamp) || !isText) {
                skippedMessages += 1;
                continue;
              }

              if (await MessageModel.findByPk(message.id)) {
                skippedMessages += 1;
                continue;
              }

              await CreateMessageService({
                messageData: {
                  id: message.id,
                  ticketId: tickets[0].id,
                  contactId: contact.id,
                  body: message.text?.body || "",
                  fromMe: message.from !== thread.id,
                  read: true,
                  mediaType: "chat",
                  ack: 0,
                  createdAt: new Date(timestamp * 1000)
                },
                broadcastToTicketRoom: false,
                broadcastToStatus: false,
                broadcastToNotification: false
              });
              persistedMessages += 1;
            }
          }
        }
      }
    }
  }

  if (historyChanges === 0) {
    throw new Error("ERR_CLOUD_API_HISTORY_PAYLOAD_REQUIRED");
  }

  return {
    recognizedHistoryChanges: historyChanges,
    persistedMessages,
    skippedMessages
  };
};

export default ProcessCloudApiHistoryWebhook;
