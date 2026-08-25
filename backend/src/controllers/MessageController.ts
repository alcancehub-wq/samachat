import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { getScopedNotificationRoom, getScopedTicketsRoom } from "../helpers/socketRooms";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import Message from "../models/Message";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  isInternal?: boolean;
};

const COMPOSER_RECORDED_AUDIO_PATTERN = /^recorded_\d{10,}\.(ogg|webm)$/i;

const isComposerRecordedAudioUpload = (media: Express.Multer.File): boolean => {
  const mimeType = (media.mimetype || "").toLowerCase();
  const originalName = (media.originalname || "").toLowerCase();

  return (
    mimeType.startsWith("audio/") &&
    /(ogg|opus|webm)/i.test(mimeType) &&
    COMPOSER_RECORDED_AUDIO_PATTERN.test(originalName)
  );
};

const emitTicketUpdate = async (ticket: Awaited<ReturnType<typeof ShowTicketService>>): Promise<void> => {
  await ticket.reload({ include: ["contact", "queue", "whatsapp", "user", "tags"] });

  const io = getIO();
  io.to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId))
    .to(ticket.id.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    accessData: {
      userId: req.user.id,
      profile: req.user.profile
    }
  });

  if (Number(ticket.unreadMessages) > 0) {
    await SetTicketMessagesAsRead(ticket);
  }

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, isInternal }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const recordedAudioPerfStartedAt = Date.now();
  const hasComposerRecordedAudio =
    medias?.some(media => isComposerRecordedAudioUpload(media)) ?? false;

  if (hasComposerRecordedAudio) {
    logger.info(
      {
        ticketId,
        mediaCount: medias.length,
        elapsedMs: 0
      },
      "Audio performance audit: controller start"
    );
  }

  const ticket = await ShowTicketService(ticketId, {
    userId: req.user.id,
    profile: req.user.profile
  });

  if (hasComposerRecordedAudio) {
    logger.info(
      {
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId,
        elapsedMs: Date.now() - recordedAudioPerfStartedAt
      },
      "Audio performance audit: ticket resolved"
    );
  }

  if (isInternal) {
    const senderUser = await ShowUserService(req.user.id);
    await ticket.update({ lastMessage: body.trim() });

    const message = await CreateMessageService({
      messageData: {
        id: uuidv4(),
        ticketId: ticket.id,
        body: body.trim(),
        contactId: ticket.contactId,
        fromMe: true,
        read: true,
        quotedMsgId: quotedMsg?.id,
        isInternal: true,
        senderName: senderUser.name
      },
      broadcastToStatus: false,
      broadcastToNotification: false
    });

    await emitTicketUpdate(ticket);

    return res.status(201).json(message);
  }

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File, mediaIndex: number) => {
        const shouldPersistRecordedAudioLocally = isComposerRecordedAudioUpload(media);
        const shouldPersistOfficialMediaLocally =
          ticket.whatsapp?.providerType === "official";
        const shouldPersistMediaLocally =
          shouldPersistRecordedAudioLocally || shouldPersistOfficialMediaLocally;
        const providerMessage = await SendWhatsAppMedia({
          media,
          ticket,
          preserveUploadedFile: shouldPersistMediaLocally
        });

        if (shouldPersistRecordedAudioLocally) {
          logger.info(
            {
              ticketId: ticket.id,
              whatsappId: ticket.whatsappId,
              mediaIndex,
              elapsedMs: Date.now() - recordedAudioPerfStartedAt
            },
            "Audio performance audit: media send completed"
          );
        }

        if (!shouldPersistMediaLocally) {
          return;
        }

        await CreateMessageService({
          messageData: {
            id:
              providerMessage.id ||
              `wwebjs-accepted-${ticket.whatsappId || "na"}-${Date.now()}-${mediaIndex}`,
            ticketId: ticket.id,
            body: providerMessage.body || "",
            fromMe: true,
            read: true,
            mediaType: providerMessage.type || "audio",
            mediaUrl: media.filename,
            ack: providerMessage.ack ?? 1
          }
        });

        logger.info(
          {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            mediaIndex,
            elapsedMs: Date.now() - recordedAudioPerfStartedAt
          },
          "Audio performance audit: local message persisted"
        );
      })
    );
  } else {
    const providerMessage = await SendWhatsAppMessage({ body, ticket, quotedMsg });

    await CreateMessageService({
      messageData: {
        id:
          providerMessage.id ||
          `wwebjs-accepted-${ticket.whatsappId || "na"}-${Date.now()}`,
        ticketId: ticket.id,
        body: providerMessage.body || body,
        fromMe: true,
        read: true,
        mediaType: providerMessage.type || "chat",
        quotedMsgId: quotedMsg?.id,
        ack: providerMessage.ack ?? 1
      }
    });
  }

  await emitTicketUpdate(ticket);

  if (hasComposerRecordedAudio) {
    logger.info(
      {
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId,
        elapsedMs: Date.now() - recordedAudioPerfStartedAt
      },
      "Audio performance audit: controller completed"
    );
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId, {
    userId: req.user.id,
    profile: req.user.profile
  });

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};
