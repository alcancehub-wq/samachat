import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { sleep } from "../../utils/sleep";
import { logger } from "../../utils/logger";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const isNoLidError = (err: unknown): boolean => {
  if (err instanceof Error && /No LID for user/i.test(err.message)) {
    return true;
  }
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: string }).message;
    if (message && /No LID for user/i.test(message)) {
      return true;
    }
  }
  return false;
};

const ensureWhatsappSession = async (
  ticket: Ticket,
  forceStart = false
): Promise<Whatsapp> => {
  if (!ticket.whatsappId) {
    throw new AppError("ERR_TICKET_NO_WHATSAPP");
  }

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  if (forceStart || whatsapp.status !== "CONNECTED") {
    await StartWhatsAppSession(whatsapp);
  }

  return whatsapp;
};

const waitForWhatsAppReady = async (
  whatsappId: number,
  timeoutMs = 20000
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await Whatsapp.findByPk(whatsappId);
    if (current?.status === "CONNECTED") {
      return true;
    }
    await sleep(1000);
  }
  return false;
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<ProviderMessage> => {
  const whatsapp = await ensureWhatsappSession(ticket);
  await waitForWhatsAppReady(whatsapp.id);

  let normalizedNumber = await whatsappProvider.checkNumber(
    whatsapp.id,
    ticket.contact.number
  );
  if (!normalizedNumber) {
    logger.warn("SendWhatsAppMessage number not validated on first try", {
      ticketId: ticket.id,
      whatsappId: whatsapp.id,
      number: ticket.contact.number
    });
    await StartWhatsAppSession(whatsapp);
    await waitForWhatsAppReady(whatsapp.id);
    normalizedNumber = await whatsappProvider.checkNumber(
      whatsapp.id,
      ticket.contact.number
    );
  }
  if (!normalizedNumber) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  if (normalizedNumber !== ticket.contact.number) {
    await ticket.contact.update({ number: normalizedNumber });
  }

  const chatId = `${normalizedNumber}@${ticket.isGroup ? "g" : "c"}.us`;
  const payload = formatBody(body, ticket.contact);

  try {
    let sentMessage: ProviderMessage;

    try {
      sentMessage = await whatsappProvider.sendMessage(
        ticket.whatsappId as number,
        chatId,
        payload,
        {
          quotedMessageId: quotedMsg?.id,
          quotedMessageFromMe: quotedMsg?.fromMe,
          linkPreview: false
        }
      );
    } catch (err) {
      if (err instanceof AppError && err.message === "ERR_WAPP_NOT_INITIALIZED") {
        logger.warn("SendWhatsAppMessage session not initialized", {
          ticketId: ticket.id,
          whatsappId: ticket.whatsappId
        });
        await ensureWhatsappSession(ticket, true);
        await waitForWhatsAppReady(whatsapp.id);
        await sleep(2000);
        sentMessage = await whatsappProvider.sendMessage(
          ticket.whatsappId as number,
          chatId,
          payload,
          {
            quotedMessageId: quotedMsg?.id,
            quotedMessageFromMe: quotedMsg?.fromMe,
            linkPreview: false
          }
        );
      } else if (isNoLidError(err)) {
        logger.warn("SendWhatsAppMessage blocked by No LID for user", {
          ticketId: ticket.id,
          whatsappId: ticket.whatsappId,
          number: ticket.contact.number
        });
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      } else {
        logger.warn(err, "SendWhatsAppMessage failed, restarting session");
        await StartWhatsAppSession(whatsapp);
        await waitForWhatsAppReady(whatsapp.id);
        await sleep(2000);
        sentMessage = await whatsappProvider.sendMessage(
          ticket.whatsappId as number,
          chatId,
          payload,
          {
            quotedMessageId: quotedMsg?.id,
            quotedMessageFromMe: quotedMsg?.fromMe,
            linkPreview: false
          }
        );
      }
    }

    await ticket.update({ lastMessage: body });
    return sentMessage;
  } catch (err) {
    if (err instanceof AppError && err.message === "ERR_WAPP_INVALID_CONTACT") {
      throw err;
    }
    logger.error(
      {
        err,
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId,
        whatsappStatus: whatsapp.status,
        number: ticket.contact.number,
        normalizedNumber,
        chatId
      },
      "SendWhatsAppMessage error"
    );
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
