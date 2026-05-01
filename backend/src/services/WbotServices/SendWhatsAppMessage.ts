import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
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

const INITIAL_READY_TIMEOUT_MS = 5000;
const RECOVERY_READY_TIMEOUT_MS = 15000;
const startingSessions = new Set<number>();

const looksLikePhoneNumber = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return /^55\d{8,13}$/.test(value);
};

const normalizeLid = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  return value.includes("@") ? value : `${value}@lid`;
};

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

const safeCheckNumber = async (
  whatsappId: number,
  number: string
): Promise<string> => {
  if (!looksLikePhoneNumber(number)) {
    return "";
  }

  try {
    return await whatsappProvider.checkNumber(whatsappId, number);
  } catch (err) {
    logger.warn(
      { err, whatsappId, number },
      "SendWhatsAppMessage checkNumber failed, falling back to raw number"
    );
    return "";
  }
};

const triggerWhatsappSessionStart = (whatsapp: Whatsapp): void => {
  if (startingSessions.has(whatsapp.id)) {
    return;
  }

  startingSessions.add(whatsapp.id);
  void StartWhatsAppSession(whatsapp).finally(() => {
    startingSessions.delete(whatsapp.id);
  });
};

const ensureWhatsappSession = async (
  ticket: Ticket,
  forceStart = false
): Promise<Whatsapp> => {
  let whatsappId = ticket.whatsappId;

  if (!whatsappId) {
    const fallbackWhatsapp = await GetDefaultWhatsApp(ticket.userId);
    await CheckContactOpenTickets(ticket.contactId, fallbackWhatsapp.id);
    await ticket.update({ whatsappId: fallbackWhatsapp.id });
    whatsappId = fallbackWhatsapp.id;
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  if (forceStart || !whatsappProvider.hasSession(whatsapp.id)) {
    triggerWhatsappSessionStart(whatsapp);
  }

  return whatsapp;
};

const waitForWhatsAppReady = async (
  whatsappId: number,
  timeoutMs = 20000
): Promise<boolean> => {
  if (whatsappProvider.isSessionReady(whatsappId)) {
    return true;
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (whatsappProvider.isSessionReady(whatsappId)) {
      return true;
    }
    await sleep(1000);
  }

  return whatsappProvider.isSessionReady(whatsappId);
};

const ensureWhatsappReady = async (
  ticket: Ticket,
  whatsapp: Whatsapp
): Promise<void> => {
  if (await waitForWhatsAppReady(whatsapp.id, INITIAL_READY_TIMEOUT_MS)) {
    return;
  }

  await ensureWhatsappSession(ticket, true);

  if (await waitForWhatsAppReady(whatsapp.id, RECOVERY_READY_TIMEOUT_MS)) {
    return;
  }

  throw new AppError("ERR_WAPP_NOT_INITIALIZED");
};

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<ProviderMessage> => {
  const whatsapp = await ensureWhatsappSession(ticket);
  await ensureWhatsappReady(ticket, whatsapp);

  const storedNumber = ticket.contact.number || "";
  const storedLid = normalizeLid(ticket.contact.lid || "");

  let normalizedNumber = await safeCheckNumber(whatsapp.id, storedNumber);
  if (!normalizedNumber) {
    logger.warn("SendWhatsAppMessage number not validated on first try", {
      ticketId: ticket.id,
      whatsappId: whatsapp.id,
      number: storedNumber,
      lid: storedLid
    });
    triggerWhatsappSessionStart(whatsapp);
    await ensureWhatsappReady(ticket, whatsapp);
    normalizedNumber = await safeCheckNumber(whatsapp.id, storedNumber);
  }

  const chatIdentifier = normalizedNumber || storedLid || storedNumber;

  if (!chatIdentifier) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  if (normalizedNumber && normalizedNumber !== storedNumber) {
    await ticket.contact.update({ number: normalizedNumber });
  }

  if (!normalizedNumber && chatIdentifier !== storedNumber) {
    logger.warn("SendWhatsAppMessage using non-phone chat identifier fallback", {
      ticketId: ticket.id,
      whatsappId: whatsapp.id,
      chatIdentifier,
      number: storedNumber,
      lid: storedLid
    });
  }

  const chatId = ticket.isGroup
    ? `${chatIdentifier}@g.us`
    : normalizedNumber
    ? `${normalizedNumber}@c.us`
    : storedLid ||
      (chatIdentifier.includes("@") ? chatIdentifier : `${chatIdentifier}@c.us`);
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
        await ensureWhatsappReady(ticket, whatsapp);
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
        if (storedLid && chatId !== storedLid) {
          logger.warn("SendWhatsAppMessage retrying with LID chat id", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: ticket.contact.number,
            lid: storedLid
          });
          sentMessage = await whatsappProvider.sendMessage(
            ticket.whatsappId as number,
            storedLid,
            payload,
            {
              quotedMessageId: quotedMsg?.id,
              quotedMessageFromMe: quotedMsg?.fromMe,
              linkPreview: false
            }
          );
        } else {
          logger.warn("SendWhatsAppMessage blocked by No LID for user", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: ticket.contact.number,
            lid: storedLid
          });
          throw new AppError("ERR_WAPP_INVALID_CONTACT");
        }
      } else {
        logger.warn(err, "SendWhatsAppMessage failed, restarting session");
        triggerWhatsappSessionStart(whatsapp);
        await ensureWhatsappReady(ticket, whatsapp);
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
