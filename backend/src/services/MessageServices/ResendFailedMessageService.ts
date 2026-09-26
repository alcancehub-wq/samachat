import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import ShowTicketService, {
  TicketAccessData
} from "../TicketServices/ShowTicketService";
import ShowUserService from "../UserServices/ShowUserService";
import ResolveOutboundChannelService from "../OutboundChannelServices/ResolveOutboundChannelService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import SendStoredWhatsAppMedia from "../WbotServices/SendStoredWhatsAppMedia";

interface Request {
  messageId: string;
  accessData: TicketAccessData;
}

interface Result {
  previousMessageId: string;
  message: Message;
}

const loadMessageForClient = async (
  messageId: string
): Promise<Message> => {
  const message = await Message.findByPk(messageId, {
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("ERR_MESSAGE_RESEND_RELOAD", 500);
  }

  return message;
};

const resolveOfficialReplyChannel = async (
  ticket: Awaited<ReturnType<typeof ShowTicketService>>,
  accessData: TicketAccessData
) => {
  if (ticket.replyOutboundMode !== "OFFICIAL") {
    return null;
  }

  const actor = await ShowUserService(accessData.userId);

  const actorQueueIds =
    (actor.queues || []).map(queue =>
      Number(queue.id)
    );

  return ResolveOutboundChannelService({
    mode: "OFFICIAL",
    context: "ticketReply",
    ownerUserId: Number(accessData.userId),
    actorProfile: accessData.profile,
    actorQueueIds,
    officialWhatsappId: ticket.replyDeliveryWhatsappId
  });
};

const extractAttachmentFilename = (
  body?: string | null
): string | undefined => {
  const normalized =
    String(body || "").trim();

  if (
    !normalized ||
    normalized.includes("\n")
  ) {
    return undefined;
  }

  const candidate =
    normalized
      .split(/[\\/]/)
      .pop()
      ?.split("?")[0]
      ?.trim() || "";

  return /^[^\r\n]+\.[a-z0-9]{2,8}$/i.test(candidate)
    ? candidate
    : undefined;
};

const ResendFailedMessageService = async ({
  messageId,
  accessData
}: Request): Promise<Result> => {
  const message =
    await Message.findByPk(messageId, {
      include: [
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

  if (!message) {
    throw new AppError(
      "ERR_MESSAGE_RESEND_NOT_FOUND",
      404
    );
  }

  if (
    !message.fromMe ||
    message.isInternal ||
    message.isDeleted ||
    Number(message.ack) !== -1
  ) {
    throw new AppError(
      "ERR_MESSAGE_RESEND_NOT_ALLOWED",
      409
    );
  }

  const ticket =
    await ShowTicketService(
      message.ticketId,
      accessData
    );

  if (ticket.status !== "open") {
    throw new AppError(
      "ERR_TICKET_NOT_OPEN_FOR_SEND",
      409
    );
  }

  const rawMediaFileName =
    (message.getDataValue("mediaUrl") as string | null) || "";

  const isMediaMessage =
    Boolean(rawMediaFileName);

  if (
    !isMediaMessage &&
    message.mediaType &&
    message.mediaType !== "chat"
  ) {
    throw new AppError(
      "ERR_MESSAGE_RESEND_UNSUPPORTED_TYPE",
      409
    );
  }

  // Atomic -1 -> 0 claim prevents double-click resend.
  const [claimedRows] =
    await Message.update(
      { ack: 0 },
      {
        where: {
          id: message.id,
          ack: -1
        }
      }
    );

  if (claimedRows !== 1) {
    throw new AppError(
      "ERR_MESSAGE_RESEND_STATE_CHANGED",
      409
    );
  }

  const previousMessageId =
    message.id;

  let providerAccepted = false;
  let acceptedMessageId:
    string | null = null;

  try {
    const officialReplyChannel =
      await resolveOfficialReplyChannel(
        ticket,
        accessData
      );

    let providerMessage;

    if (isMediaMessage) {
      const body =
        String(message.body || "").trim();

      const bodyFilename =
        extractAttachmentFilename(body);

      const bodyIsDocumentFilename =
        message.mediaType === "document" &&
        Boolean(bodyFilename);

      const originalName =
        bodyIsDocumentFilename
          ? bodyFilename
          : undefined;

      const caption =
        bodyIsDocumentFilename
          ? undefined
          : body || undefined;

      const recordedAudio =
        Boolean(
          bodyFilename &&
          /^recorded[_-]\d{10,}\.(ogg|opus|webm)$/i.test(
            bodyFilename
          )
        );

      providerMessage =
        await SendStoredWhatsAppMedia({
          ticket,
          fileName: rawMediaFileName,
          originalName,
          body: caption,
          whatsapp:
            officialReplyChannel?.whatsapp,
          forceSendAudioAsVoice:
            message.mediaType === "ptt" ||
            recordedAudio
              ? true
              : undefined
        });
    } else {
      providerMessage =
        await SendWhatsAppMessage({
          body: message.body,
          ticket,
          quotedMsg: message.quotedMsg,
          whatsapp:
            officialReplyChannel?.whatsapp
        });
    }

    providerAccepted = true;

    const nextMessageId =
      providerMessage.id ||
      previousMessageId;

    acceptedMessageId =
      nextMessageId;

    const nextAck =
      providerMessage.ack !== undefined
        ? providerMessage.ack
        : 0;

    if (
      nextMessageId !== previousMessageId
    ) {
      const existingProviderMessage =
        await Message.findByPk(
          nextMessageId
        );

      if (existingProviderMessage) {
        if (
          existingProviderMessage.ticketId !==
            message.ticketId ||
          !existingProviderMessage.fromMe
        ) {
          throw new AppError(
            "ERR_MESSAGE_RESEND_ID_CONFLICT",
            409
          );
        }

        await Message.update(
          {
            quotedMsgId:
              nextMessageId
          },
          {
            where: {
              quotedMsgId:
                previousMessageId
            }
          }
        );

        await Message.destroy({
          where: {
            id: previousMessageId
          }
        });

        return {
          previousMessageId,
          message:
            await loadMessageForClient(
              nextMessageId
            )
        };
      }
    }

    const [updatedRows] =
      await Message.update(
        {
          id: nextMessageId,
          ack: nextAck,
          read: true,
          fromMe: true,
          mediaType:
            providerMessage.type ||
            message.mediaType ||
            "chat"
        },
        {
          where: {
            id: previousMessageId,
            ack: 0
          }
        }
      );

    if (updatedRows !== 1) {
      throw new AppError(
        "ERR_MESSAGE_RESEND_STATE_CHANGED",
        409
      );
    }

    return {
      previousMessageId,
      message:
        await loadMessageForClient(
          nextMessageId
        )
    };
  } catch (err) {
    const deliveryUncertain =
      providerAccepted ||
      (
        err instanceof AppError &&
        err.message ===
          "ERR_SENDING_WAPP_MSG"
      ) ||
      (
        !isMediaMessage &&
        !(err instanceof AppError)
      );

    const recoveryAck =
      deliveryUncertain
        ? -2
        : -1;

    await Message.update(
      {
        ack: recoveryAck
      },
      {
        where: {
          id:
            acceptedMessageId ||
            previousMessageId
        }
      }
    );

    throw err;
  }
};

export default ResendFailedMessageService;
