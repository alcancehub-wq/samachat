import { spawn } from "child_process";
import { join } from "path";
import { promisify } from "util";
import { unlink, writeFile } from "fs";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";

import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import { debounce } from "../helpers/Debounce";
import formatBody from "../helpers/Mustache";
import ResolveMediaMessageBody from "../helpers/ResolveMediaMessageBody";
import ResolveMessageVariablesService from "../services/Variables/ResolveMessageVariablesService";

import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Message from "../models/Message";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import AssignInboundTicketByDistributionService from "../services/WhatsappService/AssignInboundTicketByDistributionService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import HandleIncomingFlowMessageService from "../services/FlowExecutionServices/HandleIncomingFlowMessageService";
import ResolveOfficialInboundOriginService from "../services/OutboundChannelServices/ResolveOfficialInboundOriginService";
import { PersistOfficialInboundFactsService } from "../services/OutboundChannelServices/OfficialInboundCorrelationService";
import { ResolveOfficialInboundCorrelationService } from "../services/OutboundChannelServices/OfficialInboundCorrelationService";

import { whatsappProvider } from "../providers/WhatsApp/whatsappProvider";
import { MessageType, MessageAck } from "../providers/WhatsApp/types";

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);

const publicFolder = join(__dirname, "..", "..", "public");

const runFfmpeg = (inputPath: string, outputPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      ["-y", "-i", inputPath, "-vn", "-acodec", "libmp3lame", outputPath],
      { stdio: "ignore" }
    );

    ffmpeg.once("error", reject);
    ffmpeg.once("close", code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

const maybeTranscodeAudioToMp3 = async (
  filename: string,
  mediaPayload: MediaPayload
): Promise<string> => {
  const normalizedMimeType = mediaPayload.mimetype.toLowerCase();
  if (
    !normalizedMimeType.startsWith("audio/") ||
    normalizedMimeType.includes("mpeg") ||
    filename.toLowerCase().endsWith(".mp3")
  ) {
    return filename;
  }

  const inputPath = join(publicFolder, filename);
  const outputFilename = filename.replace(/\.[^.]+$/, ".mp3");
  const outputPath = join(publicFolder, outputFilename);

  try {
    await runFfmpeg(inputPath, outputPath);
    await unlinkAsync(inputPath).catch(() => undefined);
    return outputFilename;
  } catch (err) {
    logger.warn(
      { err, filename, mimetype: mediaPayload.mimetype },
      "Failed to transcode inbound audio to mp3"
    );
    return filename;
  }
};

export interface ContactPayload {
  name: string;
  number: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup: boolean;
}

export interface MessagePayload {
  id: string;
  body: string;
  fromMe: boolean;
  hasMedia: boolean;
  type: MessageType;
  timestamp: number;
  providerTimestamp?: number;
  from: string;
  to: string;
  hasQuotedMsg?: boolean;
  quotedMsgId?: string;
  contextProviderMessageId?: string;
  mediaUrl?: string;
  mediaType?: string;
  ack?: MessageAck;
}

export interface MediaPayload {
  filename: string;
  mimetype: string;
  data: string;
}

export interface WhatsappContextPayload {
  whatsappId: number;
  unreadMessages: number;
  groupContact?: ContactPayload;
  isGroupMessage?: boolean;
}

interface MessageAckContext {
  fromMe?: boolean;
  body?: string;
  timestamp?: number;
}

const GROUP_CHAT_SUFFIX = "@g.us";
const ACK_RECONCILIATION_WINDOW_SECONDS = 180;
const OUTBOUND_DUPLICATE_WINDOW_SECONDS = 20;
const TEMPORARY_OUTBOUND_ID_PREFIXES = [
  "fallback_",
  "wwebjs-accepted-",
  "evt_me_",
  "recorded-audio-accepted-",
  "recorded-audio-echo-"
];

const isTemporaryOutboundId = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  return TEMPORARY_OUTBOUND_ID_PREFIXES.some(prefix =>
    value.startsWith(prefix)
  );
};

const normalizeProviderMessageId = (value?: string): string => {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  const serializedMatch = trimmedValue.match(/^(?:true|false)_[^_]+_(.+)$/);
  if (serializedMatch && serializedMatch[1]) {
    return serializedMatch[1];
  }

  return trimmedValue;
};

const buildEquivalentOutboundMediaTypes = (mediaType?: string): string[] => {
  if (mediaType === "audio" || mediaType === "ptt") {
    // Some outbound audio sends are initially persisted as "chat"
    // before provider echo reconciles the final media type.
    return ["audio", "ptt", "chat"];
  }

  return [mediaType || "chat"];
};

const shouldIgnoreOutboundEmptyChatEvent = (
  messagePayload: MessagePayload,
  mediaPayload?: MediaPayload
): boolean => {
  if (!messagePayload.fromMe) {
    return false;
  }

  if (messagePayload.type !== "chat" || messagePayload.hasMedia) {
    return false;
  }

  const hasBody =
    typeof messagePayload.body === "string" &&
    messagePayload.body.trim().length > 0;

  if (hasBody) {
    return false;
  }

  return !mediaPayload;
};

const areEquivalentProviderMessageIds = (
  first?: string,
  second?: string
): boolean => {
  const normalizedFirst = normalizeProviderMessageId(first);
  const normalizedSecond = normalizeProviderMessageId(second);

  return Boolean(
    normalizedFirst &&
      normalizedSecond &&
      normalizedFirst === normalizedSecond
  );
};

const isGroupChatId = (value?: string): boolean => {
  return typeof value === "string" && value.endsWith(GROUP_CHAT_SUFFIX);
};

const shouldIgnoreInboundGroupMessage = (
  messagePayload: MessagePayload,
  contactPayload: ContactPayload,
  contextPayload: WhatsappContextPayload
): boolean => {
  return Boolean(
    contextPayload.isGroupMessage ||
      contextPayload.groupContact ||
      contactPayload.isGroup ||
      isGroupChatId(messagePayload.from) ||
      isGroupChatId(messagePayload.to)
  );
};

const makeRandomId = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

const processLocationMessage = (
  messagePayload: MessagePayload
): MessagePayload => {
  if (messagePayload.type !== "location") return messagePayload;

  return messagePayload;
};

export const saveMediaFile = async (
  mediaPayload: MediaPayload
): Promise<string> => {
  const randomId = makeRandomId(5);
  const { filename: originalFilename } = mediaPayload;

  let filename: string;
  if (!originalFilename) {
    const [extension] = mediaPayload.mimetype.split("/")[1].split(";");
    filename = `${randomId}-${new Date().getTime()}.${extension}`;
  } else {
    const baseName = originalFilename.split(".").slice(0, -1).join(".");
    const extension = originalFilename.split(".").slice(-1)[0];
    filename = `${baseName}.${randomId}.${extension}`;
  }

  try {
    await writeFileAsync(
      join(publicFolder, filename),
      mediaPayload.data,
      "base64"
    );
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  return maybeTranscodeAudioToMp3(filename, mediaPayload);
};

const processVcardMessage = async (
  messagePayload: MessagePayload
): Promise<void> => {
  if (messagePayload.type !== "vcard") return;

  try {
    const array = messagePayload.body.split("\n");
    const phoneNumbers: Array<{ number: string }> = [];
    let contactName = "";

    array.forEach(line => {
      const values = line.split(":");
      values.forEach((value, index) => {
        if (value.indexOf("+") !== -1) {
          phoneNumbers.push({ number: value });
        }
        if (value.indexOf("FN") !== -1 && values[index + 1]) {
          contactName = values[index + 1];
        }
      });
    });

    await Promise.all(
      phoneNumbers.map(({ number }) =>
        CreateContactService({
          name: contactName,
          number: number.replace(/\D/g, "")
        })
      )
    );
  } catch (error) {
    logger.error("Error processing vcard message:", error);
  }
};

const handleQueueLogic = async (
  whatsappId: number,
  messageBody: string,
  ticket: Ticket,
  contactPayload: ContactPayload
): Promise<void> => {
  const { queues, greetingMessage } = await ShowWhatsAppService(whatsappId);

  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });
    return;
  }

  const selectedOption = messageBody;
  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id
    });

    const body = ResolveMessageVariablesService({
      template: `\u200e${choosenQueue.greetingMessage}`,
      ticket: {
        id: ticket.id,
        contact: {
          name: contactPayload.name,
          number: contactPayload.number,
          email: ""
        },
        user: ticket.user,
        queue: {
          id: choosenQueue.id,
          name: choosenQueue.name
        }
      },
      contact: {
        name: contactPayload.name,
        number: contactPayload.number,
        email: ""
      }
    }).text;

    try {
      await whatsappProvider.sendMessage(
        whatsappId,
        `${contactPayload.number}@c.us`,
        body
      );
    } catch (error) {
      logger.error("Error sending queue greeting message:", error);
    }
  } else {
    let options = "";
    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    const body = ResolveMessageVariablesService({
      template: `\u200e${greetingMessage}\n${options}`,
      ticket: {
        id: ticket.id,
        contact: {
          name: contactPayload.name,
          number: contactPayload.number,
          email: ""
        },
        user: ticket.user,
        queue: ticket.queue
      },
      contact: {
        name: contactPayload.name,
        number: contactPayload.number,
        email: ""
      }
    }).text;

    const debouncedSentMessage = debounce(
      async () => {
        try {
          await whatsappProvider.sendMessage(
            whatsappId,
            `${contactPayload.number}@c.us`,
            body
          );
        } catch (error) {
          logger.error("Error sending queue options message:", error);
        }
      },
      3000,
      ticket.id
    );

    debouncedSentMessage();
  }
};

export const handleMessage = async (
  messagePayload: MessagePayload,
  contactPayload: ContactPayload,
  contextPayload: WhatsappContextPayload,
  mediaPayload?: MediaPayload
): Promise<void> => {
  try {
    const processedMessage = processLocationMessage(messagePayload);

    if (shouldIgnoreOutboundEmptyChatEvent(processedMessage, mediaPayload)) {
      logger.debug(
        {
          whatsappId: contextPayload.whatsappId,
          messageId: processedMessage.id,
          from: processedMessage.from,
          to: processedMessage.to
        },
        "Ignoring outbound empty chat placeholder event"
      );
      return;
    }

    if (
      shouldIgnoreInboundGroupMessage(
        processedMessage,
        contactPayload,
        contextPayload
      )
    ) {
      logger.info(
        {
          whatsappId: contextPayload.whatsappId,
          messageId: processedMessage.id,
          from: processedMessage.from,
          to: processedMessage.to,
          fromMe: processedMessage.fromMe
        },
        "Ignoring inbound WhatsApp group message"
      );
      return;
    }

    const contact = await CreateOrUpdateContactService({
      name: contactPayload.name,
      number: contactPayload.number,
      lid: contactPayload.lid,
      profilePicUrl: contactPayload.profilePicUrl,
      isGroup: contactPayload.isGroup,
      whatsappId: contextPayload.whatsappId
    });

    let groupContact: Contact | undefined;
    if (contextPayload.groupContact) {
      groupContact = await CreateOrUpdateContactService({
        name: contextPayload.groupContact.name,
        number: contextPayload.groupContact.number,
        lid: contextPayload.groupContact.lid,
        profilePicUrl: contextPayload.groupContact.profilePicUrl,
        isGroup: contextPayload.groupContact.isGroup,
        whatsappId: contextPayload.whatsappId
      });
    }

    const whatsapp = await ShowWhatsAppService(contextPayload.whatsappId);
    if (
      contextPayload.unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === processedMessage.body
    ) {
      return;
    }

    const ticket = await FindOrCreateTicketService(
      contact,
      contextPayload.whatsappId,
      contextPayload.unreadMessages,
      groupContact
    );

    if (!processedMessage.fromMe && whatsapp.providerType === "official") {
      const origin = await ResolveOfficialInboundOriginService({
        contactId: contact.id,
        deliveryWhatsappId: contextPayload.whatsappId
      });

      if (
        origin &&
        (!ticket.userId || ticket.userId === origin.ownerUserId) &&
        (!ticket.queueId || ticket.queueId === origin.ownerQueueId)
      ) {
        await ticket.update({
          userId: origin.ownerUserId,
          queueId: origin.ownerQueueId
        });
      }
    }

    let resolvedMessageId = processedMessage.id;
    if (processedMessage.fromMe) {
      try {
        const messageTimestampMs =
          Number(processedMessage.timestamp) > 0
            ? Number(processedMessage.timestamp) * 1000
            : Date.now();
        const startDate = new Date(
          messageTimestampMs - OUTBOUND_DUPLICATE_WINDOW_SECONDS * 1000
        );
        const endDate = new Date(
          messageTimestampMs + OUTBOUND_DUPLICATE_WINDOW_SECONDS * 1000
        );

        const outboundDeduplicationWhere: any = {
          ticketId: ticket.id,
          fromMe: true,
          body: processedMessage.body,
          mediaType: {
            [Op.in]: buildEquivalentOutboundMediaTypes(processedMessage.type)
          },
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        };

        const possibleDuplicates = await Message.findAll({
          where: outboundDeduplicationWhere,
          order: [["createdAt", "DESC"]],
          limit: 5
        });

        const duplicateCandidate = possibleDuplicates.reduce<Message | null>(
          (best, current) => {
            if (current.id === processedMessage.id) {
              return best;
            }

            if (!best) {
              return current;
            }

            const bestDistance = Math.abs(
              best.createdAt.getTime() - messageTimestampMs
            );
            const currentDistance = Math.abs(
              current.createdAt.getTime() - messageTimestampMs
            );

            return currentDistance < bestDistance ? current : best;
          },
          null
        );

        if (duplicateCandidate) {
          const currentId = processedMessage.id || "";
          const candidateId = duplicateCandidate.id || "";
          const currentIsFallback = isTemporaryOutboundId(currentId);
          const candidateIsFallback = isTemporaryOutboundId(candidateId);
          const idsAreEquivalent = areEquivalentProviderMessageIds(
            currentId,
            candidateId
          );

          if (currentIsFallback || candidateIsFallback || idsAreEquivalent) {
            resolvedMessageId = duplicateCandidate.id;

            logger.warn(
              {
                ticketId: ticket.id,
                messageId: processedMessage.id,
                resolvedMessageId,
                fromMe: processedMessage.fromMe,
                timestamp: processedMessage.timestamp,
                idsAreEquivalent
              },
              "Reconciling outbound message event with existing persisted message"
            );
          }
        }
      } catch (dedupeErr) {
        logger.warn(
          {
            err: dedupeErr,
            ticketId: ticket.id,
            messageId: processedMessage.id
          },
          "Skipping outbound deduplication due to lookup error"
        );
      }
    }

    const messageData: any = {
      id: resolvedMessageId,
      ticketId: ticket.id,
      contactId: processedMessage.fromMe ? undefined : contact.id,
      body: processedMessage.body,
      fromMe: processedMessage.fromMe,
      read: processedMessage.fromMe,
      mediaType: processedMessage.type,
      quotedMsgId: processedMessage.quotedMsgId,
      ack: processedMessage.ack !== undefined ? processedMessage.ack : 0
    };

    let resolvedMessageBody = processedMessage.body || "";

    if (mediaPayload && processedMessage.hasMedia) {
      const filename = await saveMediaFile(mediaPayload);
      resolvedMessageBody = ResolveMediaMessageBody({
        body: processedMessage.body,
        originalFilename: mediaPayload.filename,
        storedFilename: filename
      });
      messageData.mediaUrl = filename;
      messageData.body = resolvedMessageBody;
      const [mediaType] = mediaPayload.mimetype.split("/");
      messageData.mediaType = mediaType;
    }

    let lastMessageText = "";
    if (processedMessage.type === "location") {
      lastMessageText = processedMessage.body.includes("Localization")
        ? processedMessage.body
        : "Localization";
    } else {
      lastMessageText =
        mediaPayload && processedMessage.hasMedia
          ? resolvedMessageBody
          : processedMessage.body || mediaPayload?.filename || "";
    }

    await ticket.update({ lastMessage: lastMessageText });

    await CreateMessageService({ messageData });

    if (!processedMessage.fromMe && whatsapp.providerType === "official" && processedMessage.id && processedMessage.providerTimestamp) {
      await PersistOfficialInboundFactsService({
        providerMessageId: processedMessage.id,
        providerTimestamp: processedMessage.providerTimestamp,
        contextProviderMessageId: processedMessage.contextProviderMessageId,
        deliveryWhatsappId: contextPayload.whatsappId,
        contactId: contact.id,
        ticketId: ticket.id
      });
      const origin = await ResolveOfficialInboundCorrelationService(processedMessage.id);
      if (origin) {
        await ticket.update({
          replyOutboundMode: "OFFICIAL",
          replyDeliveryWhatsappId: origin.deliveryWhatsappId
        });
      }
    }

    await processVcardMessage(processedMessage);

    let flowHandled = false;
    if (!contextPayload.groupContact && !processedMessage.fromMe) {
      try {
        const flowResult = await HandleIncomingFlowMessageService({
          ticketId: ticket.id,
          contactId: contact.id,
          messageBody: processedMessage.body || mediaPayload?.filename || ""
        });
        flowHandled = flowResult.handled;
      } catch (flowErr) {
        logger.error({ err: flowErr, ticketId: ticket.id }, "Error handling incoming flow automation");
      }
    }

    if (
      !flowHandled &&
      !ticket.queue &&
      !contextPayload.groupContact &&
      !processedMessage.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await handleQueueLogic(
        contextPayload.whatsappId,
        processedMessage.body,
        ticket,
        contactPayload
      );

      await ticket.reload();

      if (ticket.queueId && !ticket.userId) {
        const distributionResult =
          await AssignInboundTicketByDistributionService({
            ticketId: ticket.id,
            whatsappId: contextPayload.whatsappId
          });

        if (distributionResult) {
          await ticket.reload();
        }
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error({
      info: "Error handling message",
      err,
      messagePayload,
      contactPayload,
      contextPayload,
      mediaPayload
    });
  }
};

export const handleMessageAck = async (
  messageId: string,
  ack: MessageAck,
  context?: MessageAckContext
): Promise<void> => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const include = [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ];

    let messageToUpdate = await Message.findByPk(messageId, {
      include
    });

    if (!messageToUpdate && context?.fromMe) {
      const timestamp = Number(context.timestamp);
      if (Number.isFinite(timestamp) && timestamp > 0) {
        const startDate = new Date((timestamp - ACK_RECONCILIATION_WINDOW_SECONDS) * 1000);
        const endDate = new Date((timestamp + ACK_RECONCILIATION_WINDOW_SECONDS) * 1000);
        const normalizedBody = typeof context.body === "string" ? context.body.trim() : "";
        const where: any = {
          fromMe: true,
          createdAt: {
            [Op.between]: [startDate, endDate]
          },
          ack: {
            [Op.lt]: ack
          }
        };

        where[Op.or] = TEMPORARY_OUTBOUND_ID_PREFIXES.map(prefix => ({
          id: {
            [Op.like]: `${prefix}%`
          }
        }));

        if (normalizedBody.length > 0) {
          where.body = normalizedBody;
        }

        const fallbackMatches = await Message.findAll({
          where,
          order: [["createdAt", "DESC"]],
          limit: 5
        });

        if (fallbackMatches.length > 0) {
          const closestMatch = fallbackMatches.reduce((best, current) => {
            const bestDistance = Math.abs(best.createdAt.getTime() - timestamp * 1000);
            const currentDistance = Math.abs(current.createdAt.getTime() - timestamp * 1000);
            return currentDistance < bestDistance ? current : best;
          });

          messageToUpdate = await Message.findByPk(closestMatch.id, {
            include
          });

          logger.warn(
            {
              messageId,
              resolvedMessageId: closestMatch.id,
              ack,
              timestamp,
              bodyMatched: normalizedBody.length > 0
            },
            "Ack event matched fallback message id"
          );
        }
      }
    }

    if (!messageToUpdate) {
      return;
    }

    const nextAck = Math.max(Number(messageToUpdate.ack) || 0, Number(ack) || 0);
    if (nextAck === messageToUpdate.ack) {
      return;
    }

    await messageToUpdate.update({ ack: nextAck });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack: ${err}`);
  }
};
