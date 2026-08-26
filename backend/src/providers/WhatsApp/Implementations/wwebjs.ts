import qrCode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import {
  Client,
  LocalAuth,
  MessageMedia,
  Message as WbotMessage,
  Contact as WbotContact,
  MessageSendOptions
} from "whatsapp-web.js";
import { getIO } from "../../../libs/socket";
import Whatsapp from "../../../models/Whatsapp";
import AppError from "../../../errors/AppError";
import BuildContactNumberCandidates from "../../../helpers/BuildContactNumberCandidates";
import IsPlausiblePhoneNumber from "../../../helpers/IsPlausiblePhoneNumber";
import { logger } from "../../../utils/logger";
import { WhatsappProvider } from "../whatsappProvider";
import {
  ProviderMessage,
  ProviderMediaInput,
  SendMessageOptions,
  SendMediaOptions,
  MessageType,
  MessageAck,
  ProviderContact
} from "../types";
import {
  handleMessage,
  handleMessageAck,
  ContactPayload,
  MessagePayload,
  MediaPayload,
  WhatsappContextPayload
} from "../../../handlers/handleWhatsappEvents";
import { enqueueWhatsAppSessionStart } from "../../../services/WbotServices/WhatsAppSessionStartQueue";
import { deriveWwebjsGroupContext } from "./wwebjsGroupContext";
import { resolveContactLookupFromCandidates } from "./wwebjsNumberLookup";
import {
  ensureSessionListed,
  registerReadySession,
  resolvePersistedStatusFromChangeState
} from "./wwebjsSessionRuntime";
import { revokeMessageWithLookupFallback } from "./wwebjsDeleteLookup";
import CollectWWebJsRawReconciliationHistory from "./wwebjsReconciliationRawCollector";
import createWWebJsReconciliationAdapter from "./wwebjsReconciliationAdapter";
import RunWWebJsReconciliationBridge from "./wwebjsReconciliationBridge";
import BuildEquivalentContactNumberCandidates from "../../../helpers/BuildEquivalentContactNumberCandidates";
import {
  buildWWebJsFallbackReconciliationContactMetadata,
  mapWWebJsContactToReconciliationMetadata,
  normalizeWWebJsReconciliationLid
} from "./wwebjsReconciliationContactMetadata";
import ClassifyWhatsAppReconciliationMessageService from "../../../services/WhatsappService/ClassifyWhatsAppReconciliationMessageService";
import {
  clearOutboundEchoReservationsForSession,
  reserveOutboundEcho,
  shouldSuppressOutboundEcho
} from "./wwebjsOutboundEchoGuard";
import { shouldProcessWwebjsIncomingEvent } from "./wwebjsEventDedup";
import type {
  WbotGroupContextChat,
  WbotGroupContextSource
} from "./wwebjsGroupContext";

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];
const activeSessions = new Map<number, Session>();
const readySessions = new Set<number>();
const initializingSessions = new Map<number, Promise<void>>();
const destroyingSessions = new Map<number, Promise<void>>();
const reconnectTimers: Record<number, ReturnType<typeof setTimeout> | null> = {};
const reconnectAttempts: Record<number, number> = {};
const connectingTimers: Record<number, ReturnType<typeof setTimeout> | null> = {};
const profileLockRetries: Record<number, number> = {};
const MAX_PROFILE_LOCK_RETRIES = 3;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 5000;
const SESSION_DESTROY_GRACE_MS = 1000;
const CONNECTING_TIMEOUT_MS = Number(
  process.env.WWEBJS_CONNECTING_TIMEOUT_MS || "300000"
);
const AUTHENTICATED_TIMEOUT_MS = Number(
  process.env.WWEBJS_AUTHENTICATED_TIMEOUT_MS || "360000"
);
const INCOMING_EVENT_DEDUP_TTL_MS = Math.max(
  1000,
  Number(process.env.WWEBJS_INCOMING_EVENT_DEDUP_TTL_MS || "30000")
);
const INCOMING_EVENT_DEDUP_MAX_KEYS = Math.max(
  1000,
  Number(process.env.WWEBJS_INCOMING_EVENT_DEDUP_MAX_KEYS || "10000")
);
const incomingEventSeenAt = new Map<string, number>();

const clearReconnectTimers = (whatsappId: number): void => {
  if (reconnectTimers[whatsappId]) {
    clearTimeout(reconnectTimers[whatsappId] as ReturnType<typeof setTimeout>);
    delete reconnectTimers[whatsappId];
  }
  if (connectingTimers[whatsappId]) {
    clearTimeout(connectingTimers[whatsappId] as ReturnType<typeof setTimeout>);
    delete connectingTimers[whatsappId];
  }
};

const scheduleConnectingTimeout = (
  whatsapp: Whatsapp,
  phase: "initialize" | "authenticated",
  timeoutMs: number
): void => {
  if (connectingTimers[whatsapp.id]) {
    clearTimeout(connectingTimers[whatsapp.id] as ReturnType<typeof setTimeout>);
    delete connectingTimers[whatsapp.id];
  }

  connectingTimers[whatsapp.id] = setTimeout(async () => {
    delete connectingTimers[whatsapp.id];

    const currentWhatsapp = await Whatsapp.findByPk(whatsapp.id);
    const currentStatus = currentWhatsapp?.status;

    if (
      currentStatus &&
      ["OPENING", "connecting", "CONNECTING"].includes(currentStatus)
    ) {
      logger.warn({
        info: "Connecting timeout reached",
        whatsappId: whatsapp.id,
        status: currentStatus,
        timeoutMs,
        phase
      });
      await scheduleReconnect(whatsapp, `connecting_timeout:${phase}`);
    }
  }, timeoutMs);
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const isProfileLockError = (err: unknown): boolean => {
  if (err instanceof Error) {
    return /profile appears to be in use/i.test(err.message);
  }
  if (typeof err === "string") {
    return /profile appears to be in use/i.test(err);
  }
  return false;
};

const cleanupSessionLockFiles = (whatsappId: number): void => {
  const sessionDir = path.join(
    process.cwd(),
    ".wwebjs_auth",
    `session-bd_${whatsappId}`
  );
  if (!fs.existsSync(sessionDir)) return;

  logger.info({ sessionDir, whatsappId }, "Cleaning session locks");

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(sessionDir);
  } catch (err) {
    logger.warn(
      { err, sessionDir, whatsappId },
      "Failed to read session directory"
    );
    return;
  }

  entries.forEach(entry => {
    if (!entry.startsWith("Singleton")) return;

    const lockPath = path.join(sessionDir, entry);

    try {
      const stats = fs.lstatSync(lockPath);
      if (stats.isDirectory()) {
        fs.rmSync(lockPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(lockPath);
      }
      logger.warn({ lockPath, whatsappId }, "Removed Chromium lock entry");
    } catch (err) {
      logger.warn({ err, lockPath, whatsappId }, "Failed to remove Chromium lock entry");
    }
  });

  const devtoolsPath = path.join(sessionDir, "DevToolsActivePort");
  try {
    if (fs.existsSync(devtoolsPath)) {
      fs.unlinkSync(devtoolsPath);
      logger.warn({ devtoolsPath, whatsappId }, "Removed DevToolsActivePort");
    }
  } catch (err) {
    logger.warn({ err, devtoolsPath, whatsappId }, "Failed to remove DevToolsActivePort");
  }

  const defaultLockPath = path.join(sessionDir, "Default", "LOCK");
  try {
    if (fs.existsSync(defaultLockPath)) {
      fs.unlinkSync(defaultLockPath);
      logger.warn({ defaultLockPath, whatsappId }, "Removed Chromium Default/LOCK");
    }
  } catch (err) {
    logger.warn(
      { err, defaultLockPath, whatsappId },
      "Failed to remove Chromium Default/LOCK"
    );
  }

  try {
    const remaining = fs
      .readdirSync(sessionDir)
      .filter(entry => entry.startsWith("Singleton"));
    if (remaining.length > 0) {
      logger.warn(
        { remaining, sessionDir, whatsappId },
        "Chromium lock entries still present"
      );
    }
  } catch (err) {
    logger.warn({ err, sessionDir, whatsappId }, "Failed to recheck session directory");
  }
};

const scheduleReconnect = async (
  whatsapp: Whatsapp,
  reason: string
): Promise<void> => {
  if (reconnectTimers[whatsapp.id]) {
    logger.warn({
      info: "Reconnect already scheduled",
      whatsappId: whatsapp.id,
      reason,
      attempt: reconnectAttempts[whatsapp.id] || 0
    });
    return;
  }

  const attempt = (reconnectAttempts[whatsapp.id] || 0) + 1;
  reconnectAttempts[whatsapp.id] = attempt;

  if (attempt > MAX_RECONNECT_ATTEMPTS) {
    logger.warn({
      info: "Reconnect attempts exceeded",
      whatsappId: whatsapp.id,
      reason,
      attempt
    });
    return;
  }

  const delayMs = BASE_RECONNECT_DELAY_MS * attempt;
  logger.warn({
    info: "Scheduling reconnect",
    whatsappId: whatsapp.id,
    reason,
    attempt,
    delayMs
  });

  clearReconnectTimers(whatsapp.id);
  reconnectTimers[whatsapp.id] = setTimeout(async () => {
    delete reconnectTimers[whatsapp.id];

    void enqueueWhatsAppSessionStart(
      whatsapp,
      {
        reason: `retry:${reason}`,
        sessionName: whatsapp.name
      },
      async () => {
        try {
          await removeSession(whatsapp.id, {
            preserveReconnectState: true
          });
          await whatsapp.update({ status: "OPENING" });

          const io = getIO();
          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
          });

          await init(whatsapp);
        } catch (err) {
          logger.error(err, "Error scheduling reconnect");
        }
      }
    );
  }, delayMs);
};

const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const collectWWebJsReconciliationHistoryForSession = async ({
  sessionId,
  chatId,
  lowerBoundAt
}: {
  sessionId: number;
  chatId: string;
  lowerBoundAt: Date;
}) => {
  const wbot = getWbot(sessionId);
  const chat = await wbot.getChatById(chatId);

  return CollectWWebJsRawReconciliationHistory({
    chat,
    lowerBoundAt,

    resolveMessageId: message =>
      resolveEventMessageId(message as any),

    isKnownMessage: async messageId => {
      const classification =
        await ClassifyWhatsAppReconciliationMessageService(messageId);

      return classification === "existing";
    }
  });
};
const hasSession = (sessionId: number): boolean => {
  return sessions.some(session => session.id === sessionId);
};

const isSessionReady = (sessionId: number): boolean => {
  return readySessions.has(sessionId);
};

const isSessionActive = (sessionId: number): boolean => {
  return (
    activeSessions.has(sessionId) ||
    initializingSessions.has(sessionId) ||
    destroyingSessions.has(sessionId)
  );
};

const mapMessageType = (wbotType: any): MessageType => {
  const typeMap: Record<string, MessageType> = {
    chat: "chat",
    audio: "audio",
    ptt: "ptt",
    video: "video",
    image: "image",
    document: "document",
    vcard: "vcard",
    sticker: "sticker",
    location: "location"
  };
  return typeMap[wbotType] || "chat";
};

const mapMessageAck = (wbotAck: any): MessageAck => {
  const ackMap: Record<number, MessageAck> = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4
  };
  return ackMap[wbotAck] || 0;
};

const buildFallbackProviderMessageId = (message: {
  timestamp?: number;
  from?: string;
  to?: string;
}): string => {
  const safeTimestamp = Number(message.timestamp) || Math.floor(Date.now() / 1000);
  const safeFrom = (message.from || "unknown").replace(/[^a-zA-Z0-9@._-]/g, "");
  const safeTo = (message.to || "unknown").replace(/[^a-zA-Z0-9@._-]/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);

  return `fallback_${safeTimestamp}_${safeFrom}_${safeTo}_${suffix}`;
};

const resolveProviderMessageId = (wbotMessage: any): string => {
  const candidates = [
    wbotMessage?.id?.id,
    wbotMessage?.id?._serialized,
    wbotMessage?._data?.id?.id,
    wbotMessage?._data?.id?._serialized,
    typeof wbotMessage?.id === "string" ? wbotMessage.id : ""
  ];

  const resolved = candidates.find(value => typeof value === "string" && value.length > 0);
  if (resolved) {
    return resolved;
  }

  logger.warn(
    {
      from: wbotMessage?.from,
      to: wbotMessage?.to,
      fromMe: wbotMessage?.fromMe,
      type: wbotMessage?.type,
      hasMedia: wbotMessage?.hasMedia
    },
    "wwebjs sendMessage returned payload without message id; using fallback id"
  );

  return buildFallbackProviderMessageId({
    timestamp: Number(wbotMessage?.timestamp) || undefined,
    from: typeof wbotMessage?.from === "string" ? wbotMessage.from : undefined,
    to: typeof wbotMessage?.to === "string" ? wbotMessage.to : undefined
  });
};

const sanitizeMessageIdPart = (value: unknown, fallback: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value.replace(/[^a-zA-Z0-9@._-]/g, "");
};

const buildFallbackEventMessageId = (wbotMessage: any): string => {
  const safeTimestamp = Number(wbotMessage?.timestamp) || Math.floor(Date.now() / 1000);
  const safeFrom = sanitizeMessageIdPart(wbotMessage?.from, "unknown_from");
  const safeTo = sanitizeMessageIdPart(wbotMessage?.to, "unknown_to");
  const safeBody = sanitizeMessageIdPart(
    typeof wbotMessage?.body === "string" ? wbotMessage.body.slice(0, 24) : "",
    "nobody"
  );
  const direction = wbotMessage?.fromMe ? "me" : "in";

  return `evt_${direction}_${safeTimestamp}_${safeFrom}_${safeTo}_${safeBody}`;
};

const resolveEventMessageId = (wbotMessage: any): string => {
  const candidates = [
    wbotMessage?.id?.id,
    wbotMessage?.id?._serialized,
    wbotMessage?._data?.id?.id,
    wbotMessage?._data?.id?._serialized,
    typeof wbotMessage?.id === "string" ? wbotMessage.id : ""
  ];

  const resolved = candidates.find(
    value => typeof value === "string" && value.length > 0
  );

  if (resolved) {
    return resolved;
  }

  const fallbackId = buildFallbackEventMessageId(wbotMessage);

  logger.warn(
    {
      fallbackId,
      from: wbotMessage?.from,
      to: wbotMessage?.to,
      fromMe: wbotMessage?.fromMe,
      type: wbotMessage?.type
    },
    "wwebjs event payload without message id; using deterministic fallback"
  );

  return fallbackId;
};

const cleanupIncomingEventDedup = (now: number): void => {
  for (const [cacheKey, seenAt] of incomingEventSeenAt.entries()) {
    if (now - seenAt > INCOMING_EVENT_DEDUP_TTL_MS) {
      incomingEventSeenAt.delete(cacheKey);
      continue;
    }

    break;
  }

  if (incomingEventSeenAt.size <= INCOMING_EVENT_DEDUP_MAX_KEYS) {
    return;
  }

  let overflow = incomingEventSeenAt.size - INCOMING_EVENT_DEDUP_MAX_KEYS;
  for (const cacheKey of incomingEventSeenAt.keys()) {
    incomingEventSeenAt.delete(cacheKey);
    overflow -= 1;
    if (overflow <= 0) {
      break;
    }
  }
};

const clearIncomingEventDedupForSession = (sessionId: number): void => {
  const keyPrefix = `${sessionId}:`;

  for (const cacheKey of incomingEventSeenAt.keys()) {
    if (cacheKey.startsWith(keyPrefix)) {
      incomingEventSeenAt.delete(cacheKey);
    }
  }
};

const shouldProcessIncomingEvent = (
  sessionId: number,
  eventName: string,
  msg: WbotMessage
): boolean => {
  const message = msg as any;
  const messageId = resolveEventMessageId(message);

  if (!messageId) {
    return true;
  }

  const now = Date.now();
  cleanupIncomingEventDedup(now);

  const shouldProcess = shouldProcessWwebjsIncomingEvent({
    cache: incomingEventSeenAt,
    now,
    ttlMs: INCOMING_EVENT_DEDUP_TTL_MS,
    sessionId,
    eventName,
    messageId,
    from: message?.from || "",
    to: message?.to || ""
  });

  if (!shouldProcess) {
    logger.debug(
      {
        whatsappId: sessionId,
        eventName,
        messageId
      },
      "Skipping duplicated incoming wwebjs event"
    );
  }

  return shouldProcess;
};

const convertToProviderMessage = (
  wbotMessage: WbotMessage
): ProviderMessage => {
  const message = wbotMessage as any;
  const resolvedAck =
    message.ack === undefined && message.fromMe
      ? 1
      : mapMessageAck(message.ack);

  return {
    id: resolveProviderMessageId(message),
    body: typeof message.body === "string" ? message.body : "",
    fromMe: Boolean(message.fromMe),
    hasMedia: Boolean(message.hasMedia),
    type: mapMessageType(message.type),
    timestamp: Number(message.timestamp) || Math.floor(Date.now() / 1000),
    from: typeof message.from === "string" ? message.from : "",
    to: typeof message.to === "string" ? message.to : "",
    hasQuotedMsg: Boolean(message.hasQuotedMsg),
    ack: resolvedAck
  };
};

const getSerializedMessageId = (
  chatId: string,
  fromMe: boolean,
  messageId: string
): string => {
  const serializedMsgId = `${fromMe}_${chatId}_${messageId}`;

  return serializedMsgId;
};



const buildFallbackContactPayloadFromMessage = (
  msg: WbotMessage
): ContactPayload | null =>
  buildWWebJsFallbackReconciliationContactMetadata(
    msg as any
  ) as ContactPayload | null;

const convertToContactPayload = async (
  msgContact: WbotContact
): Promise<ContactPayload> =>
  (await mapWWebJsContactToReconciliationMetadata(
    msgContact as any
  )) as ContactPayload;

const extractSessionPhoneNumber = (wbot: Session): string | null => {
  const clientInfo = (wbot.info || {}) as any;
  const rawValue =
    clientInfo?.wid?.user ||
    clientInfo?.me?.user ||
    clientInfo?.wid?._serialized ||
    clientInfo?.me?._serialized ||
    "";

  if (typeof rawValue !== "string") {
    return null;
  }

  const normalizedValue = rawValue.split("@")[0].replace(/\D/g, "");
  return normalizedValue || null;
};

const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<string | undefined> => {
  if (!msg.hasQuotedMsg) return undefined;

  try {
    const wbotQuotedMsg = await msg.getQuotedMessage();
    return wbotQuotedMsg.id.id;
  } catch (err) {
    logger.warn(
      {
        err,
        messageId: (msg as any)?.id?._serialized || (msg as any)?.id?.id
      },
      "Unable to resolve quoted message from WhatsApp payload"
    );
    return undefined;
  }
};

const prepareLocation = (msg: WbotMessage): WbotMessage => {
  const { location } = msg as any;
  const gmapsUrl = `https://maps.google.com/maps?q=${location.latitude}%2C${location.longitude}&z=17&hl=pt-BR`;

  msg.body = `data:image/png;base64,${msg.body}|${gmapsUrl}`;
  msg.body += `|${
    location.description
      ? location.description
      : `${location.latitude}, ${location.longitude}`
  }`;

  return msg;
};

const convertToMessagePayload = async (
  msg: WbotMessage
): Promise<MessagePayload> => {
  let processedMsg = msg;
  if (msg.type === "location") {
    processedMsg = prepareLocation(msg);
  }

  const quotedMsgId = await verifyQuotedMessage(processedMsg);
  const processedAny = processedMsg as any;

  return {
    id: resolveEventMessageId(processedAny),
    body: processedMsg.body,
    fromMe: processedMsg.fromMe,
    hasMedia: processedMsg.hasMedia,
    type: mapMessageType(processedMsg.type),
    timestamp: processedMsg.timestamp,
    from: processedMsg.from,
    to: processedMsg.to,
    hasQuotedMsg: processedMsg.hasQuotedMsg,
    quotedMsgId
  };
};

const resolveWwebjsSerializedMessageId = (msg: WbotMessage): string => {
  const message = msg as any;

  return (
    message?.id?._serialized ||
    message?.id?.$1 ||
    message?._data?.id?._serialized ||
    message?._data?.id?.$1 ||
    ""
  );
};

const downloadInboundMediaWithSerializedCompat = async (
  msg: WbotMessage
): Promise<
  | {
      filename?: string;
      mimetype: string;
      data: string;
    }
  | undefined
> => {
  const message = msg as any;
  const serializedMessageId = resolveWwebjsSerializedMessageId(msg);

  if (!serializedMessageId) {
    return undefined;
  }

  const client = message?.client;
  const pupPage = client?.pupPage;

  if (!pupPage) {
    return undefined;
  }

  const result = await pupPage.evaluate((msgId: string) => {
    const wwebjs = (window as any).WWebJS;

    return wwebjs.resolveMediaBlob(msgId).then((resolved: any) => {
      if (!resolved) {
        return null;
      }

      return resolved.blob.arrayBuffer().then((buffer: ArrayBuffer) =>
        wwebjs.arrayBufferToBase64Async(buffer).then((data: string) => ({
          data,
          mimetype: resolved.mimetype,
          filename: resolved.filename || ""
        }))
      );
    });
  }, serializedMessageId);

  if (!result) {
    return undefined;
  }

  return result;
};
const convertToMediaPayload = async (
  msg: WbotMessage,
  eventName = "unknown",
  sessionId?: number
): Promise<MediaPayload | undefined> => {
  const messageId =
    (msg as any)?.id?._serialized ||
    (msg as any)?.id?.id ||
    resolveEventMessageId(msg as any);

  const observableMediaTypes = new Set([
    "audio",
    "ptt",
    "video",
    "image",
    "document",
    "sticker"
  ]);
  const observeInboundMedia =
    !msg.fromMe && observableMediaTypes.has(msg.type);

  if (!msg.hasMedia) {
    if (observeInboundMedia) {
      logger.warn(
        {
          eventName,
          sessionId,
          messageId,
          messageType: msg.type,
          fromMe: msg.fromMe,
          hasMedia: false
        },
        "WhatsApp inbound media message arrived without available media payload"
      );
    }

    return undefined;
  }

  if (observeInboundMedia) {
    logger.info(
      {
        eventName,
        sessionId,
        messageId,
        messageType: msg.type,
        fromMe: msg.fromMe,
        hasMedia: true
      },
      "Attempting WhatsApp inbound media payload download"
    );
  }

  let media;
  try {
    media = await msg.downloadMedia();
  } catch (err) {
    logger.warn(
      {
        err,
        eventName,
        sessionId,
        messageId,
        messageType: msg.type,
        fromMe: msg.fromMe,
        hasMedia: true,
        serializedMessageId: resolveWwebjsSerializedMessageId(msg)
      },
      "Unable to download WhatsApp media payload; trying serialized-id compatibility fallback"
    );

    if (!msg.fromMe && observeInboundMedia) {
      try {
        media = await downloadInboundMediaWithSerializedCompat(msg);

        if (media) {
          logger.info(
            {
              eventName,
              sessionId,
              messageId,
              messageType: msg.type,
              serializedMessageId: resolveWwebjsSerializedMessageId(msg),
              mimetype: media.mimetype,
              dataLength:
                typeof media.data === "string" ? media.data.length : 0
            },
            "WhatsApp inbound media compatibility fallback succeeded"
          );
        }
      } catch (compatErr) {
        logger.warn(
          {
            err: compatErr,
            eventName,
            sessionId,
            messageId,
            messageType: msg.type,
            serializedMessageId: resolveWwebjsSerializedMessageId(msg)
          },
          "WhatsApp inbound media compatibility fallback failed"
        );
      }
    }

    if (!media) {
      return undefined;
    }
  }

  if (!media) {
    if (observeInboundMedia) {
      logger.warn(
        {
          eventName,
          sessionId,
          messageId,
          messageType: msg.type,
          fromMe: msg.fromMe,
          hasMedia: true
        },
        "WhatsApp inbound media download returned empty payload"
      );
    }

    return undefined;
  }

  if (observeInboundMedia) {
    logger.info(
      {
        eventName,
        sessionId,
        messageId,
        messageType: msg.type,
        fromMe: msg.fromMe,
        hasMedia: true,
        mimetype: media.mimetype,
        filenamePresent: Boolean(media.filename),
        dataLength:
          typeof media.data === "string"
            ? media.data.length
            : 0
      },
      "WhatsApp inbound media payload download succeeded"
    );
  }

  return {
    filename: media.filename || "",
    mimetype: media.mimetype,
    data: media.data
  };
};

const shouldHandleMessage = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;

  const supportedMessageTypes = new Set([
    "chat",
    "audio",
    "ptt",
    "video",
    "image",
    "document",
    "vcard",
    "sticker",
    "location"
  ]);

  if (!supportedMessageTypes.has(msg.type)) {
    const hasTextBody =
      typeof msg.body === "string" && msg.body.trim().length > 0;

    if (!hasTextBody) {
      return false;
    }

    logger.warn(
      {
        messageType: msg.type,
        from: msg.from,
        fromMe: msg.fromMe
      },
      "Processing unsupported WhatsApp message type because it carries text body"
    );
  }

  // Ignore queue/menu bootstrap messages that start with direction mark.
  const firstBodyChar =
    typeof msg.body === "string" && msg.body.length > 0 ? msg.body[0] : "";
  if (firstBodyChar && /\u200e/.test(firstBodyChar)) return false;

  // Additional validation for messages from me
  if (msg.fromMe) {
    if (
      !msg.hasMedia &&
      msg.type !== "location" &&
      msg.type !== "chat" &&
      msg.type !== "vcard"
    ) {
      return false;
    }
  }

  return true;
};

const getMessageData = async (
  msg: WbotMessage,
  wbot: Session,
  eventName = "unknown"
): Promise<{
  messagePayload: MessagePayload;
  contactPayload: ContactPayload;
  contextPayload: WhatsappContextPayload;
  mediaPayload: MediaPayload | undefined;
}> => {
  let msgContact: WbotContact;
  let contactPayload: ContactPayload;
  let groupContact: ContactPayload | undefined;

  let chat: any;
  try {
    chat = await msg.getChat();
  } catch (err) {
    logger.warn(
      {
        err,
        messageId: (msg as any)?.id?._serialized || (msg as any)?.id?.id,
        from: msg.from,
        to: msg.to,
        fromMe: msg.fromMe
      },
      "Unable to resolve chat context from WhatsApp message; using fallback context"
    );

    chat = {
      unreadCount: msg.fromMe ? 0 : 1,
      isGroup: (msg.from || "").endsWith("@g.us") || (msg.to || "").endsWith("@g.us"),
      id: {
        _serialized: msg.fromMe ? msg.to : msg.from
      },
      name: ""
    };
  }

  const groupContext = deriveWwebjsGroupContext(
    msg as WbotGroupContextSource,
    chat as WbotGroupContextChat
  );

  if (groupContext.isGroupMessage) {
    if (groupContext.groupChatId) {
      try {
        const groupWbotContact = await wbot.getContactById(groupContext.groupChatId);
        groupContact = await convertToContactPayload(groupWbotContact);
      } catch (err) {
        logger.warn(
          { err, groupChatId: groupContext.groupChatId },
          "Unable to resolve group contact"
        );
      }
    }

    const resolvedGroupContact =
      groupContact || groupContext.fallbackContactPayload!;
    groupContact = resolvedGroupContact;
    contactPayload = resolvedGroupContact;
  } else {
    if (msg.fromMe) {
      try {
        msgContact = await wbot.getContactById(msg.to);
      } catch (err) {
        logger.warn(err, "Unable to resolve contact by id, falling back to message contact");
        msgContact = await msg.getContact();
      }

      contactPayload = await convertToContactPayload(msgContact);
    } else {
      try {
        msgContact = await msg.getContact();
        contactPayload = await convertToContactPayload(msgContact);
      } catch (err) {
        logger.warn(
          {
            err,
            from: msg.from,
            messageId: (msg as any)?.id?._serialized || (msg as any)?.id?.id
          },
          "Unable to resolve inbound contact from message payload"
        );

        try {
          msgContact = await wbot.getContactById(msg.from);
          contactPayload = await convertToContactPayload(msgContact);
        } catch (lookupErr) {
          logger.warn(
            {
              err: lookupErr,
              from: msg.from
            },
            "Unable to resolve inbound contact by id, falling back to message-derived contact payload"
          );

          const fallbackContactPayload = buildFallbackContactPayloadFromMessage(msg);
          if (!fallbackContactPayload) {
            throw lookupErr;
          }

          contactPayload = fallbackContactPayload;
        }
      }
    }

    if (!contactPayload) {
      throw new Error("Unable to resolve contact payload");
    }
  }

  const unreadMessages = msg.fromMe ? 0 : Math.max(Number(chat.unreadCount) || 0, 1);

  const messagePayload = await convertToMessagePayload(msg);
  const mediaPayload = await convertToMediaPayload(msg, eventName, wbot.id);

  const inboundMediaTypes = new Set([
    "audio",
    "ptt",
    "video",
    "image",
    "document",
    "sticker"
  ]);

  if (
    !msg.fromMe &&
    msg.hasMedia &&
    inboundMediaTypes.has(msg.type) &&
    !mediaPayload
  ) {
    const mediaError = new Error(
      `Inbound WhatsApp media payload unavailable for ${resolveWwebjsSerializedMessageId(
        msg
      ) || resolveEventMessageId(msg as any)}`
    );

    logger.warn(
      {
        eventName,
        sessionId: wbot.id,
        messageId:
          resolveWwebjsSerializedMessageId(msg) ||
          resolveEventMessageId(msg as any),
        messageType: msg.type,
        fromMe: false,
        hasMedia: true
      },
      "Blocking persistence of inbound media message without downloaded payload"
    );

    throw mediaError;
  }

  const contextPayload: WhatsappContextPayload = {
    whatsappId: wbot.id!,
    unreadMessages,
    groupContact,
    isGroupMessage: groupContext.isGroupMessage
  };

  return {
    messagePayload,
    contactPayload,
    contextPayload,
    mediaPayload
  };
};

const resolveWWebJsReconciliationMessageMetadata = async (
  msg: WbotMessage,
  wbot: Session
): Promise<ContactPayload> => {
  let chat: any;

  try {
    chat = await msg.getChat();
  } catch (err) {
    logger.warn(
      {
        err,
        messageId:
          (msg as any)?.id?._serialized ||
          (msg as any)?.id?.id,
        from: msg.from,
        to: msg.to,
        fromMe: msg.fromMe
      },
      "Unable to resolve reconciliation chat context; using fallback context"
    );

    chat = {
      unreadCount: msg.fromMe ? 0 : 1,
      isGroup:
        (msg.from || "").endsWith("@g.us") ||
        (msg.to || "").endsWith("@g.us"),
      id: {
        _serialized:
          msg.fromMe
            ? msg.to
            : msg.from
      },
      name: ""
    };
  }

  const groupContext =
    deriveWwebjsGroupContext(
      msg as WbotGroupContextSource,
      chat as WbotGroupContextChat
    );

  if (groupContext.isGroupMessage) {
    let groupContact:
      | ContactPayload
      | undefined;

    if (groupContext.groupChatId) {
      try {
        const groupWbotContact =
          await wbot.getContactById(
            groupContext.groupChatId
          );

        groupContact =
          await convertToContactPayload(
            groupWbotContact
          );
      } catch (err) {
        logger.warn(
          {
            err,
            groupChatId:
              groupContext.groupChatId
          },
          "Unable to resolve reconciliation group contact"
        );
      }
    }

    const resolvedGroupContact =
      groupContact ||
      groupContext.fallbackContactPayload;

    if (!resolvedGroupContact) {
      throw new Error(
        "Unable to resolve reconciliation group contact metadata"
      );
    }

    return resolvedGroupContact;
  }

  let contactPayload:
    | ContactPayload
    | undefined;

  if (msg.fromMe) {
    try {
      const msgContact =
        await wbot.getContactById(
          msg.to
        );

      contactPayload =
        await convertToContactPayload(
          msgContact
        );
    } catch (err) {
      logger.warn(
        {
          err,
          to: msg.to
        },
        "Unable to resolve outbound reconciliation contact by id; falling back to message contact"
      );

      const msgContact =
        await msg.getContact();

      contactPayload =
        await convertToContactPayload(
          msgContact
        );
    }
  } else {
    try {
      const msgContact =
        await msg.getContact();

      contactPayload =
        await convertToContactPayload(
          msgContact
        );
    } catch (err) {
      logger.warn(
        {
          err,
          from: msg.from,
          messageId:
            (msg as any)?.id?._serialized ||
            (msg as any)?.id?.id
        },
        "Unable to resolve inbound reconciliation contact from message"
      );

      try {
        const msgContact =
          await wbot.getContactById(
            msg.from
          );

        contactPayload =
          await convertToContactPayload(
            msgContact
          );
      } catch (lookupErr) {
        logger.warn(
          {
            err: lookupErr,
            from: msg.from
          },
          "Unable to resolve inbound reconciliation contact by id; using message-derived metadata"
        );

        contactPayload =
          buildFallbackContactPayloadFromMessage(
            msg
          ) || undefined;
      }
    }
  }

  if (!contactPayload) {
    throw new Error(
      "Unable to resolve reconciliation contact metadata"
    );
  }

  return contactPayload;
};

export const createWWebJsReconciliationAdapterForSession = (
  sessionId: number,
  options: {
    targetChatIds?: string[];
    targetedRepair?: boolean;
  } = {}
) => {
  const wbot =
    getWbot(sessionId);

  return createWWebJsReconciliationAdapter({
    whatsappId: sessionId,

    targetChatIds: options.targetChatIds,
    includeContactProfilePic:
      Boolean(options.targetedRepair),

    services:
      options.targetedRepair
        ? {
            /*
             * Targeted repair is intentionally independent from
             * the connection-wide incremental checkpoint.
             *
             * Scanner classification is overridden only so a
             * known recent Message.id does not stop traversal.
             * RunWhatsAppReconciliationService still performs
             * the real persistence/deduplication classification.
             */
            getCheckpoint:
              async () => null,

            saveCheckpoint:
              async () => undefined,

            classifyMessage:
              async () => "new" as const,

            classifyMessages:
              async () => new Set<string>(),

            resolveBoundary:
              ({ capturedBoundaryAt }) => ({
                mode: "recovery" as const,
                lowerBoundAt: new Date(1),
                checkpointCandidateAt:
                  new Date(
                    capturedBoundaryAt.getTime()
                  )
              })
          }
        : undefined,

    session: wbot as any,

    resolveMessageId:
      message =>
        resolveEventMessageId(
          message as any
        ),

    shouldHandleMessage:
      message =>
        shouldHandleMessage(
          message as WbotMessage
        ),

    resolveMessageMetadata:
      async message =>
        resolveWWebJsReconciliationMessageMetadata(
          message as WbotMessage,
          wbot
        ),

    processNewMessage:
      async message => {
        const {
          messagePayload,
          contactPayload,
          contextPayload,
          mediaPayload
        } =
          await getMessageData(
            message as WbotMessage,
            wbot,
            "reconciliation"
          );

        await handleMessage(
          messagePayload,
          contactPayload,
          contextPayload,
          mediaPayload
        );
      }
  });
};

export const runManualWWebJsReconciliationForSession = async (
  sessionId: number,
  options: {
    ticketId?: number | null;
    targetContact?: {
      number?: string | null;
      lid?: string | null;
    } | null;
  } = {}
) => {
  const {
    ticketId = null,
    targetContact = null
  } = options;

  const targetChatIds = new Set<string>();

  if (ticketId !== null && targetContact) {
    const numberCandidates =
      BuildEquivalentContactNumberCandidates(
        String(targetContact.number || "")
      );

    for (const number of numberCandidates) {
      const normalized = String(number || "").trim();

      if (normalized) {
        targetChatIds.add(
          normalized.includes("@")
            ? normalized
            : `${normalized}@c.us`
        );
      }
    }

    const lid = String(targetContact.lid || "").trim();

    if (lid) {
      targetChatIds.add(
        lid.includes("@")
          ? lid
          : `${lid}@lid`
      );
    }
  }

  if (ticketId !== null && targetChatIds.size === 0) {
    throw new Error(
      "ERR_RECONCILIATION_TARGET_WITHOUT_PROVIDER_IDENTITY"
    );
  }

  const targetedRepair = ticketId !== null;

  const reconciliation =
    createWWebJsReconciliationAdapterForSession(
      sessionId,
      {
        targetChatIds:
          targetedRepair
            ? Array.from(targetChatIds)
            : undefined,
        targetedRepair
      }
    );

  return RunWWebJsReconciliationBridge({
    whatsappId: sessionId,
    trigger: "manual",
    collectWork:
      reconciliation.collectWork,
    finalizeWork:
      reconciliation.finalizeWork
  });
};

const runAutomaticWWebJsReconciliationForSession = async (
  sessionId: number
): Promise<void> => {
  try {
    const reconciliation =
      createWWebJsReconciliationAdapterForSession(
        sessionId
      );

    const result =
      await RunWWebJsReconciliationBridge({
        whatsappId: sessionId,
        trigger: "automatic",
        collectWork:
          reconciliation.collectWork,
        finalizeWork:
          reconciliation.finalizeWork
      });

    logger.info(
      {
        whatsappId: sessionId,
        checkedMessages:
          result.checkedMessages,
        importedMessages:
          result.importedMessages,
        existingMessages:
          result.existingMessages,
        skippedMessages:
          result.skippedMessages,
        contactsChecked:
          result.contactsChecked
      },
      "Automatic WhatsApp reconciliation completed"
    );
  } catch (err) {
    /*
     * Automatic reconciliation is best-effort relative to
     * session readiness. A lock collision, Redis failure,
     * provider/history error or reconciliation failure must
     * never turn a READY WhatsApp session into a failed one.
     */
    logger.warn(
      {
        err,
        whatsappId: sessionId
      },
      "Automatic WhatsApp reconciliation did not complete"
    );
  }
};

const syncUnreadMessages = async (wbot: Session) => {
  try {
    const chats = await wbot.getChats();

    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const chat of chats) {
      if (chat.unreadCount > 0) {
        let unreadMessages: WbotMessage[] = [];

        try {
          unreadMessages = await chat.fetchMessages({
            limit: chat.unreadCount
          });
        } catch (err) {
          logger.warn(err, "Error fetching unread messages");
          continue;
        }

        for (const msg of unreadMessages) {
          if (shouldHandleMessage(msg)) {
            const {
              messagePayload,
              contactPayload,
              contextPayload,
              mediaPayload
            } = await getMessageData(msg, wbot, "sync_unread");

            handleMessage(
              messagePayload,
              contactPayload,
              contextPayload,
              mediaPayload
            );
          }
        }

        await chat.sendSeen();
      }
    }
  } catch (err) {
    logger.error(err, "Error syncing unread messages");
  }
};

const removeSession = async (
  whatsappId: number,
  options: { preserveReconnectState?: boolean } = {}
): Promise<void> => {
  const preserveReconnectState = options.preserveReconnectState === true;

  clearReconnectTimers(whatsappId);
  readySessions.delete(whatsappId);

  if (!preserveReconnectState) {
    delete reconnectAttempts[whatsappId];
  }

  delete profileLockRetries[whatsappId];
  clearIncomingEventDedupForSession(whatsappId);
  clearOutboundEchoReservationsForSession(whatsappId);
  initializingSessions.delete(whatsappId);

  const existingDestroy = destroyingSessions.get(whatsappId);
  if (existingDestroy) {
    await existingDestroy;
    return;
  }

  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  const listedSession = sessionIndex === -1 ? undefined : sessions[sessionIndex];
  if (sessionIndex !== -1) {
    sessions.splice(sessionIndex, 1);
  }

  const session = activeSessions.get(whatsappId) || listedSession;
  if (!session) {
    return;
  }

  activeSessions.delete(whatsappId);

  let destroyPromise: Promise<void> | undefined;
  destroyPromise = (async () => {
    try {
      session.removeAllListeners();
      await session.destroy();
    } catch (err) {
      logger.error({ err, whatsappId }, "Error destroying whatsapp session");
    } finally {
      await delay(SESSION_DESTROY_GRACE_MS);
      clearReconnectTimers(whatsappId);

      if (!preserveReconnectState) {
        delete reconnectAttempts[whatsappId];
      }

      delete profileLockRetries[whatsappId];
      clearIncomingEventDedupForSession(whatsappId);
      clearOutboundEchoReservationsForSession(whatsappId);
      if (destroyPromise && destroyingSessions.get(whatsappId) === destroyPromise) {
        destroyingSessions.delete(whatsappId);
      }
    }
  })();

  destroyingSessions.set(whatsappId, destroyPromise);
  await destroyPromise;
};

const sendMessage = async (
  sessionId: number,
  to: string,
  body: string,
  options?: SendMessageOptions
): Promise<ProviderMessage> => {
  const wbot = getWbot(sessionId);

  const quotedMsgSerializedId = options?.quotedMessageId
    ? getSerializedMessageId(
        to,
        Boolean(options?.quotedMessageFromMe),
        options?.quotedMessageId
      )
    : "";

  const outboundReservation = reserveOutboundEcho(sessionId, {
    kind: "text",
    to,
    body
  });

  try {
    const sentMessage = await wbot.sendMessage(to, body, {
      quotedMessageId: quotedMsgSerializedId,
      linkPreview: options?.linkPreview
    });

    if (!sentMessage) {
      logger.warn(
        {
          sessionId,
          to
        },
        "wwebjs sendMessage returned empty payload; using fallback provider message"
      );

      const providerMessage = convertToProviderMessage({
        body,
        fromMe: true,
        hasMedia: false,
        type: "chat",
        ack: 1,
        timestamp: Math.floor(Date.now() / 1000),
        from: "",
        to
      } as WbotMessage);

      outboundReservation.complete(providerMessage.id);
      return providerMessage;
    }

    const providerMessage = convertToProviderMessage(sentMessage);
    outboundReservation.complete(providerMessage.id);
    return providerMessage;
  } catch (err) {
    outboundReservation.cancel();
    logger.error(
      {
        err,
        sessionId,
        to
      },
      "wwebjs sendMessage failed"
    );
    throw err;
  }
};

const sendMedia = async (
  sessionId: number,
  to: string,
  media: ProviderMediaInput,
  options?: SendMediaOptions
): Promise<ProviderMessage> => {
  const wbot = getWbot(sessionId);
  const mediaData = media.path
    ? fs.readFileSync(media.path, { encoding: "base64" })
    : media.data?.toString("base64") || "";

  const messageMedia =
    media.filename !== undefined && media.filename !== null
      ? new MessageMedia(media.mimetype, mediaData, media.filename)
      : new MessageMedia(media.mimetype, mediaData);

  const mediaOptions: MessageSendOptions = {
    caption: options?.caption,
    sendAudioAsVoice: options?.sendAudioAsVoice,
    quotedMessageId: options?.quotedMessageId
  };

  if (options?.sendMediaAsDocument !== undefined) {
    mediaOptions.sendMediaAsDocument = options.sendMediaAsDocument;
  }

  const outboundReservation = reserveOutboundEcho(sessionId);

  try {
    const sentMessage = await wbot.sendMessage(to, messageMedia, mediaOptions);
    const providerMessage = convertToProviderMessage(sentMessage);

    outboundReservation.complete(providerMessage.id);
    return providerMessage;
  } catch (err) {
    outboundReservation.cancel();
    throw err;
  }
};

const checkNumberLookup = async (
  sessionId: number,
  number: string
): Promise<import("../whatsappProvider").ProviderContactLookupResult> => {
  const wbot = getWbot(sessionId);

  const sessionPhoneNumber = extractSessionPhoneNumber(wbot);
  const candidates = BuildContactNumberCandidates(number, sessionPhoneNumber);

  return resolveContactLookupFromCandidates(candidates, async candidate =>
    (await wbot.getNumberId(`${candidate}@c.us`)) as {
      user?: string | null;
      server?: string | null;
      _serialized?: string | null;
    }
  );
};

const checkNumber = async (
  sessionId: number,
  number: string
): Promise<string> => {
  const lookupResult = await checkNumberLookup(sessionId, number);
  return lookupResult.number;
};

const getProfilePicUrl = async (
  sessionId: number,
  number: string
): Promise<string> => {
  const wbot = getWbot(sessionId);
  const profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);
  return profilePicUrl;
};

const sendSeen = async (sessionId: number, chatId: string): Promise<void> => {
  const wbot = getWbot(sessionId);
  const chat = await wbot.getChatById(chatId);
  await chat.sendSeen();
};

const fetchChatMessages = async (
  sessionId: number,
  chatId: string,
  limit = 100
): Promise<ProviderMessage[]> => {
  const wbot = getWbot(sessionId);
  const chat = await wbot.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit });

  return messages.map(convertToProviderMessage);
};

const getContacts = async (sessionId: number): Promise<ProviderContact[]> => {
  const wbot = getWbot(sessionId);
  const contacts = await wbot.getContacts();

  return contacts.map(contact => ({
    id: contact.id.user,
    name: contact.name || contact.pushname,
    pushname: contact.pushname,
    number: contact.id.user,
    profilePicUrl: undefined,
    isGroup: contact.isGroup
  }));
};

const logout = async (sessionId: number): Promise<void> => {
  const wbot = getWbot(sessionId);
  await wbot.logout();
};

const deleteMessage = async (
  sessionId: number,
  chatId: string,
  messageId: string,
  fromMe: boolean
): Promise<void> => {
  const wbot = getWbot(sessionId);

  await revokeMessageWithLookupFallback(
    wbot,
    chatId,
    messageId,
    fromMe,
    getSerializedMessageId,
    logger
  );
};

const initInternal = async (whatsapp: Whatsapp): Promise<void> => {
  try {
    await removeSession(whatsapp.id);
    cleanupSessionLockFiles(whatsapp.id);

    const io = getIO();
    const sessionName = whatsapp.name;
    const sessionCfg = whatsapp?.session ? JSON.parse(whatsapp.session) : {};

    logger.info(
      {
        whatsappId: whatsapp.id,
        sessionName
      },
      "Initializing WhatsApp session"
    );

    const args: string = process.env.CHROME_ARGS || "";
    const protocolTimeout = Number(
      process.env.PUPPETEER_PROTOCOL_TIMEOUT || "300000"
    );
    const authTimeoutMs = Number(
      process.env.WWEBJS_AUTH_TIMEOUT_MS || "300000"
    );
    const takeoverTimeoutMs = Number(
      process.env.WWEBJS_TAKEOVER_TIMEOUT_MS || "0"
    );
    const userAgent =
      process.env.WWEBJS_USER_AGENT ||
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.101 Safari/537.36";

    const chromeArgs = Array.from(
      new Set([
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-extensions",
        "--disable-default-apps",
        "--mute-audio",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        ...args.split(" ").map(arg => arg.trim()).filter(Boolean)
      ])
    );

    const wbot: Session = new Client({
      session: sessionCfg,
      authStrategy: new LocalAuth({ clientId: `bd_${whatsapp.id}` }),
      authTimeoutMs,
      takeoverOnConflict: true,
      takeoverTimeoutMs,
      userAgent,
      webVersionCache: {
        type: "none"
      },
      puppeteer: {
        // headless: false, // TODO make sure chromium closes on session disconnection / delete
        executablePath: process.env.CHROME_BIN || undefined,
        browserWSEndpoint: process.env.CHROME_WS || undefined,
        protocolTimeout,
        args: chromeArgs
      }
    });

    wbot.id = whatsapp.id;
    activeSessions.set(whatsapp.id, wbot);

    wbot.on("qr", async qr => {
      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName
        },
        "WhatsApp session waiting for QR code"
      );
      qrCode.generate(qr, { small: true });
      await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });
      readySessions.delete(whatsapp.id);
      ensureSessionListed(sessions, wbot);

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });

    wbot.on("authenticated", async () => {
      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName
        },
        "WhatsApp session authenticated"
      );

      try {
        // Once QR is accepted, clear stale QR so UI can show "connecting" progress.
        await whatsapp.update({ status: "OPENING", qrcode: "" });
        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });
      } catch (err) {
        logger.error(
          { err, whatsappId: whatsapp.id, sessionName },
          "Error updating whatsapp session after authentication"
        );
      }

      scheduleConnectingTimeout(
        whatsapp,
        "authenticated",
        AUTHENTICATED_TIMEOUT_MS
      );
    });

    wbot.on("auth_failure", async msg => {
      logger.error(
        {
          whatsappId: whatsapp.id,
          sessionName,
          reason: msg
        },
        "WhatsApp authentication failure"
      );
      readySessions.delete(whatsapp.id);

      if (whatsapp.retries > 1) {
        await whatsapp.update({ session: "", retries: 0 });
      }

      await whatsapp.update({
        status: "DISCONNECTED",
        retries: whatsapp.retries + 1
      });

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });

      await scheduleReconnect(whatsapp, "auth_failure");
    });

    wbot.on("ready", async () => {
      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName
        },
        "WhatsApp session ready"
      );

      clearReconnectTimers(whatsapp.id);
      reconnectAttempts[whatsapp.id] = 0;
      registerReadySession(sessions, readySessions, wbot);

      try {
        const connectedPhoneNumber = extractSessionPhoneNumber(wbot);

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          phoneNumber: connectedPhoneNumber
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        wbot.sendPresenceAvailable();
      } catch (err) {
        logger.error(err, "Error on whatsapp ready event");
      }
    });

    wbot.on("change_state", async newState => {
      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName,
          newState
        },
        "WhatsApp session state changed"
      );
      if (newState !== "CONNECTED") {
        readySessions.delete(whatsapp.id);
      }
      try {
        const persistedStatus = resolvePersistedStatusFromChangeState(
          readySessions.has(whatsapp.id),
          newState
        );

        if (newState === "CONNECTED" && persistedStatus !== "CONNECTED") {
          logger.warn(
            {
              whatsappId: whatsapp.id,
              sessionName,
              newState
            },
            "Ignoring CONNECTED state change until ready event completes"
          );
        }

        const updatePayload: Partial<Whatsapp> = { status: persistedStatus };
        if (newState === "CONNECTED") {
          updatePayload.qrcode = "";
        }

        await whatsapp.update(updatePayload);

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        if (["disconnected", "DISCONNECTED", "browser_close"].includes(newState)) {
          await scheduleReconnect(whatsapp, `change_state:${newState}`);
        }
      } catch (err) {
        logger.error(err, "Error on whatsapp change state event");
      }
    });

    wbot.on("disconnected", async reason => {
      logger.warn(
        {
          whatsappId: whatsapp.id,
          sessionName,
          reason
        },
        "WhatsApp session disconnected"
      );
      readySessions.delete(whatsapp.id);
      try {
        await whatsapp.update({ status: "OPENING" });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        logger.warn(
          `Session ${sessionName} disconnected. Restarting in 2 seconds...`
        );

        await scheduleReconnect(whatsapp, `disconnected:${reason}`);
      } catch (err) {
        logger.error(err, "Error on whatsapp disconnected event");
      }
    });

    clearReconnectTimers(whatsapp.id);
    scheduleConnectingTimeout(whatsapp, "initialize", CONNECTING_TIMEOUT_MS);

    wbot.on("message", async msg => {
      if (msg.fromMe || !shouldHandleMessage(msg)) return;
      if (!shouldProcessIncomingEvent(wbot.id || whatsapp.id, "message", msg)) {
        return;
      }

      try {
        const { messagePayload, contactPayload, contextPayload, mediaPayload } =
          await getMessageData(msg, wbot, "message");

        await handleMessage(
          messagePayload,
          contactPayload,
          contextPayload,
          mediaPayload
        );
      } catch (err) {
        logger.error(err, "Error on whatsapp message event");
      }
    });

    wbot.on("message_create", async msg => {
      if (!shouldHandleMessage(msg)) return;
      if (
        !shouldProcessIncomingEvent(
          wbot.id || whatsapp.id,
          "message_create",
          msg
        )
      ) {
        return;
      }

      try {
        const sessionId = wbot.id || whatsapp.id;
        const eventMessageId = resolveEventMessageId(msg as any);

        if (
          msg.fromMe &&
          (await shouldSuppressOutboundEcho(
            sessionId,
            eventMessageId,
            undefined,
            msg.type === "chat" && !msg.hasMedia
              ? {
                  kind: "text",
                  to: typeof msg.to === "string" ? msg.to : "",
                  body: typeof msg.body === "string" ? msg.body : ""
                }
              : undefined
          ))
        ) {
          logger.debug(
            {
              whatsappId: sessionId,
              messageId: eventMessageId,
              eventName: "message_create"
            },
            "Skipping local outbound echo already reserved by provider send"
          );
          return;
        }

        const { messagePayload, contactPayload, contextPayload, mediaPayload } =
          await getMessageData(msg, wbot, "message_create");

        await handleMessage(
          messagePayload,
          contactPayload,
          contextPayload,
          mediaPayload
        );
      } catch (err) {
        logger.error(err, "Error on whatsapp message create event");
      }
    });

    wbot.on("media_uploaded", async msg => {
      if (!shouldHandleMessage(msg)) return;
      if (
        !shouldProcessIncomingEvent(
          wbot.id || whatsapp.id,
          "media_uploaded",
          msg
        )
      ) {
        return;
      }

      try {
        const sessionId = wbot.id || whatsapp.id;
        const eventMessageId = resolveEventMessageId(msg as any);

        if (
          msg.fromMe &&
          (await shouldSuppressOutboundEcho(sessionId, eventMessageId))
        ) {
          logger.debug(
            {
              whatsappId: sessionId,
              messageId: eventMessageId,
              eventName: "media_uploaded"
            },
            "Skipping local outbound media echo already reserved by provider send"
          );
          return;
        }

        const { messagePayload, contactPayload, contextPayload, mediaPayload } =
          await getMessageData(msg, wbot, "media_uploaded");

        await handleMessage(
          messagePayload,
          contactPayload,
          contextPayload,
          mediaPayload
        );
      } catch (err) {
        logger.error(err, "Error on whatsapp media uploaded event");
      }
    });

    wbot.on("message_ack", async (msg, ack) => {
      const messageId = resolveEventMessageId(msg as any);
      handleMessageAck(messageId, mapMessageAck(ack), {
        fromMe: Boolean((msg as any)?.fromMe),
        body: typeof (msg as any)?.body === "string" ? (msg as any).body : "",
        timestamp: Number((msg as any)?.timestamp) || Math.floor(Date.now() / 1000)
      });
    });

    await wbot.initialize();
  } catch (err) {
    if (isProfileLockError(err)) {
      const attempt = (profileLockRetries[whatsapp.id] || 0) + 1;
      profileLockRetries[whatsapp.id] = attempt;

      logger.warn({ whatsappId: whatsapp.id }, "Detected Chrome profile lock");

      if (attempt <= MAX_PROFILE_LOCK_RETRIES) {
        logger.warn(
          { whatsappId: whatsapp.id, attempt },
          "Retrying WhatsApp session"
        );
        await removeSession(whatsapp.id);
        cleanupSessionLockFiles(whatsapp.id);
        await delay(2000 * attempt);
        await initInternal(whatsapp);
        return;
      }
    }

    logger.error(err, "Error on whatsapp session");
    try {
      const hasQrCode = Boolean(whatsapp.qrcode);

      await whatsapp.update({ status: hasQrCode ? "qrcode" : "OPENING" });

      const io = getIO();
      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });

      if (!hasQrCode) {
        await scheduleReconnect(whatsapp, "init_error");
      }
    } catch (innerErr) {
      logger.error(innerErr, "Error handling whatsapp init failure");
    }
  }
};

const init = async (whatsapp: Whatsapp): Promise<void> => {
  const existingInit = initializingSessions.get(whatsapp.id);
  if (existingInit) {
    logger.warn(
      { whatsappId: whatsapp.id },
      "WhatsApp session init already in progress"
    );
    return existingInit;
  }

  if (activeSessions.has(whatsapp.id)) {
    logger.warn(
      { whatsappId: whatsapp.id },
      "WhatsApp session already has an active client"
    );
    return;
  }

  let initPromise: Promise<void> | undefined;
  initPromise = (async () => {
    try {
      await initInternal(whatsapp);
    } finally {
      if (initPromise && initializingSessions.get(whatsapp.id) === initPromise) {
        initializingSessions.delete(whatsapp.id);
      }
    }
  })();

  initializingSessions.set(whatsapp.id, initPromise);
  return initPromise;
};

export const WhatsappWebJsProvider: WhatsappProvider = {
  init,
  hasSession,
  isSessionReady,
  isSessionActive,
  removeSession,
  logout,
  sendMessage,
  sendMedia,
  deleteMessage,
  checkNumber,
  checkNumberLookup,
  getProfilePicUrl,
  getContacts,
  sendSeen,
  fetchChatMessages
};
