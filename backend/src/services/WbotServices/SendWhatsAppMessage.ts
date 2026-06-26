import AppError from "../../errors/AppError";
import BuildContactNumberCandidates from "../../helpers/BuildContactNumberCandidates";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import IsPlausiblePhoneNumber from "../../helpers/IsPlausiblePhoneNumber";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import CheckContactNumber, {
  CheckContactNumberLookupResult
} from "./CheckNumber";
import ResolveMessageVariablesService from "../Variables/ResolveMessageVariablesService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { sleep } from "../../utils/sleep";
import { logger } from "../../utils/logger";
import CloudApiClient from "../CloudApiServices/CloudApiClient";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

interface NumberLookupResult {
  normalizedNumber: string;
  resolvedChatId?: string;
  resolvedLid?: string;
  status: "resolved" | "not_found" | "inconclusive";
  errorCode?: string;
}

const INITIAL_READY_TIMEOUT_MS = 5000;
const RECOVERY_READY_TIMEOUT_MS = 15000;
const MESSAGE_LOOKUP_TIMEOUT_MS = 12000;

const withMessageLookupTimeout = async <T>(
  promise: Promise<T>
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new AppError("ERR_WAPP_CHECK_CONTACT_TIMEOUT"));
        }, MESSAGE_LOOKUP_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};
const startingSessions = new Set<number>();

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
  whatsapp: Whatsapp,
  number: string,
  ticketId: number
): Promise<NumberLookupResult> => {
  if (!IsPlausiblePhoneNumber(number)) {
    return {
      normalizedNumber: "",
      status: "not_found"
    };
  }

  const candidates = BuildContactNumberCandidates(number, whatsapp.phoneNumber);

  try {
    const lookupResult = (await withMessageLookupTimeout(
      CheckContactNumber(number, {
        whatsappId: whatsapp.id,
        returnLookupResult: true
      })
    )) as CheckContactNumberLookupResult;
    const normalizedNumber = lookupResult.number;

    if (normalizedNumber || lookupResult.chatId) {
      return {
        normalizedNumber,
        resolvedChatId: lookupResult.chatId,
        resolvedLid: lookupResult.lid,
        status: "resolved"
      };
    }

    logger.warn(
      {
        flow: "messages",
        ticketId,
        whatsappId: whatsapp.id,
        number,
        candidates
      },
      "SendWhatsAppMessage lookup returned no confirmed number"
    );

    return {
      normalizedNumber: "",
      status: "inconclusive"
    };
  } catch (err) {
    if (err instanceof AppError && err.message === "ERR_NUMBER_NOT_ON_WHATSAPP") {
      return {
        normalizedNumber: "",
        status: "not_found",
        errorCode: err.message
      };
    }

    logger.warn(
      {
        err,
        flow: "messages",
        ticketId,
        whatsappId: whatsapp.id,
        number,
        candidates
      },
      "SendWhatsAppMessage checkNumber failed"
    );

    return {
      normalizedNumber: "",
      status: "inconclusive",
      errorCode: err instanceof AppError ? err.message : undefined
    };
  }
};

const resolveLookupFailureError = (
  lookup: NumberLookupResult
): AppError => {
  if (lookup.errorCode === "ERR_WAPP_NOT_INITIALIZED") {
    return new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  if (lookup.status === "not_found") {
    return new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  return new AppError("ERR_WAPP_CHECK_CONTACT");
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

  if (whatsapp.providerType === "official") {
    return whatsapp;
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
  if (whatsappProvider.hasSession(whatsapp.id)) {
    return;
  }

  if (await waitForWhatsAppReady(whatsapp.id, INITIAL_READY_TIMEOUT_MS)) {
    return;
  }

  await ensureWhatsappSession(ticket, true);

  if (await waitForWhatsAppReady(whatsapp.id, RECOVERY_READY_TIMEOUT_MS)) {
    return;
  }

  throw new AppError("ERR_WAPP_NOT_INITIALIZED");
};

const sendOfficialCloudApiTextMessage = async ({
  whatsapp,
  ticket,
  payload,
  resolvedBody
}: {
  whatsapp: Whatsapp;
  ticket: Ticket;
  payload: string;
  resolvedBody: string;
}): Promise<ProviderMessage> => {
  const storedNumber = ticket.contact.number || "";

  if (!storedNumber) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  const client = new CloudApiClient({
    accessToken: whatsapp.accessToken,
    phoneNumberId: whatsapp.phoneNumberId,
    apiVersion: whatsapp.apiVersion
  });

  const result = await client.sendText({
    to: storedNumber,
    body: payload,
    previewUrl: false
  });

  await ticket.update({ lastMessage: resolvedBody });

  return {
    id: result.messages?.[0]?.id || `cloudapi-${ticket.id}-${Date.now()}`,
    ack: 1,
    body: payload,
    fromMe: true,
    hasMedia: false,
    type: "chat" as any,
    timestamp: Math.floor(Date.now() / 1000),
    from: whatsapp.phoneNumber || whatsapp.phoneNumberId || "",
    to: storedNumber
  } as ProviderMessage;
};
const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<ProviderMessage> => {
  const whatsapp = await ensureWhatsappSession(ticket);

  if (whatsapp.providerType !== "official") {
    await ensureWhatsappReady(ticket, whatsapp);
  }

  const storedNumber = ticket.contact.number || "";
  const storedLid = normalizeLid(ticket.contact.lid || "");

  let normalizedNumber = "";
  let numberLookup: NumberLookupResult | null = null;

  const resolveNumberLookup = async (): Promise<NumberLookupResult> => {
    if (!numberLookup) {
      numberLookup = await safeCheckNumber(whatsapp, storedNumber, ticket.id);
      normalizedNumber = numberLookup.normalizedNumber;
    }

    return numberLookup;
  };

  const resolveNormalizedChatId = async (): Promise<string | null> => {
    if (ticket.isGroup || !storedNumber) {
      return null;
    }

    const lookup = await resolveNumberLookup();

    return lookup.normalizedNumber ? `${lookup.normalizedNumber}@c.us` : null;
  };

  const resolveAlternativeChatId = async (): Promise<string | null> => {
    if (ticket.isGroup || !storedNumber) {
      return null;
    }

    const lookup = await resolveNumberLookup();

    return lookup.resolvedChatId || null;
  };

  const chatIdentifier = storedLid || storedNumber;

  if (!chatIdentifier) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  if (chatIdentifier !== storedNumber) {
    logger.warn("SendWhatsAppMessage using non-phone chat identifier fallback", {
      ticketId: ticket.id,
      whatsappId: whatsapp.id,
      chatIdentifier,
      number: storedNumber,
      lid: storedLid
    });
  }

  let chatId = ticket.isGroup
    ? `${chatIdentifier}@g.us`
    : storedLid ||
      (chatIdentifier.includes("@") ? chatIdentifier : `${chatIdentifier}@c.us`);
  const { text: resolvedBody } = ResolveMessageVariablesService({
    template: body,
    ticket,
    contact: ticket.contact,
    user: ticket.user
  });
  const payload = formatBody(resolvedBody, ticket.contact);

  if (whatsapp.providerType === "official") {
    return sendOfficialCloudApiTextMessage({
      whatsapp,
      ticket,
      payload,
      resolvedBody
    });
  }

  const sendWithChatId = async (targetChatId: string): Promise<ProviderMessage> =>
    whatsappProvider.sendMessage(ticket.whatsappId as number, targetChatId, payload, {
      quotedMessageId: quotedMsg?.id,
      quotedMessageFromMe: quotedMsg?.fromMe,
      linkPreview: false
    });

  try {
    let sentMessage: ProviderMessage;

    try {
      sentMessage = await sendWithChatId(chatId);
    } catch (err) {
      if (err instanceof AppError && err.message === "ERR_WAPP_NOT_INITIALIZED") {
        logger.warn("SendWhatsAppMessage session not initialized", {
          ticketId: ticket.id,
          whatsappId: ticket.whatsappId
        });
        await ensureWhatsappSession(ticket, true);
        await ensureWhatsappReady(ticket, whatsapp);
        await sleep(2000);
        sentMessage = await sendWithChatId(chatId);
      } else if (isNoLidError(err)) {
        if (storedLid && chatId !== storedLid) {
          logger.warn("SendWhatsAppMessage retrying with LID chat id", {
            ticketId: ticket.id,
            whatsappId: ticket.whatsappId,
            number: ticket.contact.number,
            lid: storedLid
          });
          chatId = storedLid;
          sentMessage = await sendWithChatId(chatId);
        } else {
          const alternativeChatId = await resolveAlternativeChatId();
          if (alternativeChatId && alternativeChatId !== chatId) {
            chatId = alternativeChatId;
            sentMessage = await sendWithChatId(chatId);
          } else {
            const lookup = await resolveNumberLookup();

            logger.warn("SendWhatsAppMessage blocked by No LID for user", {
              ticketId: ticket.id,
              whatsappId: ticket.whatsappId,
              number: ticket.contact.number,
              lid: storedLid,
              lookupChatId: lookup.resolvedChatId,
              lookupLid: lookup.resolvedLid,
              lookupStatus: lookup.status,
              lookupErrorCode: lookup.errorCode,
              candidates: BuildContactNumberCandidates(
                storedNumber,
                whatsapp.phoneNumber
              )
            });

            throw resolveLookupFailureError(lookup);
          }
        }
      } else {
        const normalizedChatId = await resolveNormalizedChatId();
        if (normalizedChatId && normalizedChatId !== chatId) {
          try {
            chatId = normalizedChatId;
            sentMessage = await sendWithChatId(chatId);
            await ticket.update({ lastMessage: resolvedBody });
            if (normalizedNumber && normalizedNumber !== storedNumber) {
              await ticket.contact.update({ number: normalizedNumber });
            }
            return sentMessage;
          } catch (normalizedErr) {
            err = normalizedErr;
          }
        }

        logger.warn(err, "SendWhatsAppMessage failed, restarting session");
        triggerWhatsappSessionStart(whatsapp);
        await ensureWhatsappReady(ticket, whatsapp);
        await sleep(2000);
        sentMessage = await sendWithChatId(chatId);
      }
    }

    await ticket.update({ lastMessage: resolvedBody });
    if (normalizedNumber && normalizedNumber !== storedNumber) {
      await ticket.contact.update({ number: normalizedNumber });
    }
    return sentMessage;
  } catch (err) {
    if (err instanceof AppError) {
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
