import Contact from "../../models/Contact";
import Message from "../../models/Message";
import CreateMessageService from "../MessageServices/CreateMessageService";
import ResolveOperationalTicketService from "../TicketServices/ResolveOperationalTicketService";
import { Op } from "sequelize";

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
const MessageModel = Message as any;
const OUTBOUND_DUPLICATE_WINDOW_SECONDS = 20;
const TEMPORARY_OUTBOUND_ID_PREFIXES = [
  "fallback_",
  "wwebjs-accepted-",
  "evt_me_",
  "recorded-audio-accepted-",
  "recorded-audio-echo-"
];

const isTemporaryOutboundId = (value?: string): boolean =>
  Boolean(
    value &&
      TEMPORARY_OUTBOUND_ID_PREFIXES.some(prefix => value.startsWith(prefix))
  );

const normalizeProviderMessageId = (value?: string): string => {
  const trimmedValue = value?.trim() || "";
  const serializedMatch = trimmedValue.match(/^(?:true|false)_[^_]+_(.+)$/);

  return serializedMatch?.[1] || trimmedValue;
};

const findHistoricalOutboundDuplicate = async ({
  messageId,
  ticketId,
  body,
  providerCreatedAt
}: {
  messageId: string;
  ticketId: number;
  body: string;
  providerCreatedAt: Date;
}): Promise<boolean> => {
  const messageTimestampMs = providerCreatedAt.getTime();
  const candidates = await MessageModel.findAll({
    where: {
      ticketId,
      fromMe: true,
      body,
      mediaType: "chat",
      createdAt: {
        [Op.between]: [
          new Date(messageTimestampMs - OUTBOUND_DUPLICATE_WINDOW_SECONDS * 1000),
          new Date(messageTimestampMs + OUTBOUND_DUPLICATE_WINDOW_SECONDS * 1000)
        ]
      }
    },
    order: [["createdAt", "DESC"]],
    limit: 5
  });

  const normalizedMessageId = normalizeProviderMessageId(messageId);
  const temporaryCandidate = candidates
    .filter((candidate: any) =>
      candidate.id === messageId ||
      normalizeProviderMessageId(candidate.id) === normalizedMessageId ||
      isTemporaryOutboundId(candidate.id)
    )
    .sort(
      (first: any, second: any) =>
        Math.abs(first.createdAt.getTime() - messageTimestampMs) -
        Math.abs(second.createdAt.getTime() - messageTimestampMs)
    )[0];

  return Boolean(temporaryCandidate);
};

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

            const ticket = await ResolveOperationalTicketService({
              contactId: contact.id,
              allowMultipleConversations: Boolean(
                contact.allowMultipleConversations
              ),
              ...(contact.allowMultipleConversations ? { whatsappId } : {})
            });
            if (!ticket) {
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

              const providerCreatedAt = new Date(timestamp * 1000);
              const fromMe = message.from !== thread.id;

              if (
                fromMe &&
                await findHistoricalOutboundDuplicate({
                  messageId: message.id,
                  ticketId: ticket.id,
                  body: message.text!.body!,
                  providerCreatedAt
                })
              ) {
                skippedMessages += 1;
                continue;
              }

              await CreateMessageService({
                messageData: {
                  id: message.id,
                  ticketId: ticket.id,
                  contactId: contact.id,
                  body: message.text?.body || "",
                  fromMe,
                  read: true,
                  mediaType: "chat",
                  ack: 0,
                  createdAt: providerCreatedAt
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
