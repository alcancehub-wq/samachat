import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import CreateMessageService from "../MessageServices/CreateMessageService";
import ResolveOperationalTicketService from "../TicketServices/ResolveOperationalTicketService";
import CloudApiClient from "../CloudApiServices/CloudApiClient";
import { saveMediaFile } from "../../handlers/handleWhatsappEvents";
import { Op } from "sequelize";

interface CloudApiHistoryMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  image?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  video?: { id?: string; mime_type?: string; caption?: string; filename?: string };
  document?: { id?: string; mime_type?: string; caption?: string; filename?: string };
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
const HISTORICAL_MEDIA_TYPES = ["audio", "image", "video", "document"] as const;
type HistoricalMediaType = typeof HISTORICAL_MEDIA_TYPES[number];
type HistoricalMedia = NonNullable<CloudApiHistoryMessage["audio"]>;

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
  mediaType,
  providerCreatedAt
}: {
  messageId: string;
  ticketId: number;
  body: string;
  mediaType: string;
  providerCreatedAt: Date;
}): Promise<boolean> => {
  const messageTimestampMs = providerCreatedAt.getTime();
  const candidates = await MessageModel.findAll({
    where: {
      ticketId,
      fromMe: true,
      body,
      mediaType,
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
  const matchingCandidates = candidates
    .filter((candidate: any) =>
      candidate.id === messageId ||
      normalizeProviderMessageId(candidate.id) === normalizedMessageId ||
      isTemporaryOutboundId(candidate.id)
    );

  return matchingCandidates.length === 1;
};

const getHistoricalMedia = (
  message: CloudApiHistoryMessage
): { type: HistoricalMediaType; media: HistoricalMedia } | undefined => {
  if (!HISTORICAL_MEDIA_TYPES.includes(message.type as HistoricalMediaType)) {
    return undefined;
  }

  const type = message.type as HistoricalMediaType;
  const media = message[type];

  return media ? { type, media } : undefined;
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
  let cloudApiClient: CloudApiClient | undefined;

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
              const historicalMedia = getHistoricalMedia(message);
              if (
                !message.id ||
                !timestamp ||
                Number.isNaN(timestamp) ||
                (!isText && !historicalMedia)
              ) {
                skippedMessages += 1;
                continue;
              }

              if (await MessageModel.findByPk(message.id)) {
                skippedMessages += 1;
                continue;
              }

              const providerCreatedAt = new Date(timestamp * 1000);
              const fromMe = message.from !== thread.id;
              const mediaType = historicalMedia?.type || "chat";
              let body = message.text?.body || "";
              let mediaUrl: string | undefined;

              if (historicalMedia) {
                if (!historicalMedia.media.id) {
                  skippedMessages += 1;
                  continue;
                }

                try {
                  if (!cloudApiClient) {
                    const whatsapp = await Whatsapp.findByPk(whatsappId);
                    if (!whatsapp) {
                      skippedMessages += 1;
                      continue;
                    }

                    cloudApiClient = new CloudApiClient({
                      accessToken: whatsapp.accessToken,
                      phoneNumberId: whatsapp.phoneNumberId,
                      apiVersion: whatsapp.apiVersion
                    });
                  }

                  const mediaMetadata = await cloudApiClient.retrieveMedia(
                    historicalMedia.media.id
                  );
                  if (!mediaMetadata.url) {
                    skippedMessages += 1;
                    continue;
                  }

                  const downloadedMedia = await cloudApiClient.downloadMedia(
                    mediaMetadata.url
                  );
                  const filename = historicalMedia.media.filename || "";
                  const mimetype =
                    downloadedMedia.mimetype ||
                    mediaMetadata.mime_type ||
                    historicalMedia.media.mime_type ||
                    "application/octet-stream";

                  mediaUrl = await saveMediaFile({
                    filename,
                    mimetype,
                    data: downloadedMedia.data.toString("base64")
                  });
                  body = historicalMedia.media.caption || filename;
                } catch {
                  skippedMessages += 1;
                  continue;
                }
              }

              if (
                fromMe &&
                await findHistoricalOutboundDuplicate({
                  messageId: message.id,
                  ticketId: ticket.id,
                  body,
                  mediaType,
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
                  body,
                  fromMe,
                  read: true,
                  mediaType,
                  mediaUrl,
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
