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

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];
const reconnectTimers: Record<number, ReturnType<typeof setTimeout> | null> = {};
const reconnectAttempts: Record<number, number> = {};
const connectingTimers: Record<number, ReturnType<typeof setTimeout> | null> = {};
const profileLockRetries: Record<number, number> = {};
const MAX_PROFILE_LOCK_RETRIES = 3;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 5000;
const CONNECTING_TIMEOUT_MS = 60000;

const clearReconnectTimers = (whatsappId: number): void => {
  if (reconnectTimers[whatsappId]) {
    clearTimeout(reconnectTimers[whatsappId] as ReturnType<typeof setTimeout>);
    reconnectTimers[whatsappId] = null;
  }
  if (connectingTimers[whatsappId]) {
    clearTimeout(connectingTimers[whatsappId] as ReturnType<typeof setTimeout>);
    connectingTimers[whatsappId] = null;
  }
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const killChromeProcesses = (): void => {
  try {
    logger.warn("Killing Chrome processes");
    require("child_process").execSync(
      "pkill -9 -f chrome || true; pkill -9 -f chromium || true",
      { stdio: "ignore" }
    );
  } catch (err) {
    logger.warn({ err }, "Failed to kill Chrome processes");
  }
};

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
  const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];

  if (!fs.existsSync(sessionDir)) return;

  logger.info({ sessionDir, whatsappId }, "Cleaning session locks");

  const entries = new Set<string>();
  try {
    fs.readdirSync(sessionDir).forEach(entry => entries.add(entry));
  } catch (err) {
    logger.warn({ err, sessionDir, whatsappId }, "Failed to read session directory");
  }

  lockFiles.forEach(lockFile => entries.add(lockFile));

  entries.forEach(entry => {
    if (!entry.startsWith("Singleton")) return;

    const lockPath = path.join(sessionDir, entry);
    if (!fs.existsSync(lockPath)) return;

    try {
      const stats = fs.statSync(lockPath);
      if (stats.isDirectory()) {
        fs.rmSync(lockPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(lockPath);
      }
      logger.warn({ lockPath, whatsappId }, "Removed stale Chromium lock");
    } catch (err) {
      logger.warn({ err, lockPath, whatsappId }, "Failed to remove Chromium lock");
    }
  });
};

const scheduleReconnect = async (
  whatsapp: Whatsapp,
  reason: string
): Promise<void> => {
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
    try {
      removeSession(whatsapp.id);
      await whatsapp.update({ status: "OPENING" });
      await init(whatsapp);
    } catch (err) {
      logger.error(err, "Error scheduling reconnect");
    }
  }, delayMs);
};

const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
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

const convertToProviderMessage = (
  wbotMessage: WbotMessage
): ProviderMessage => {
  return {
    id: wbotMessage.id.id,
    body: wbotMessage.body,
    fromMe: wbotMessage.fromMe,
    hasMedia: wbotMessage.hasMedia,
    type: mapMessageType(wbotMessage.type),
    timestamp: wbotMessage.timestamp,
    from: wbotMessage.from,
    to: wbotMessage.to,
    hasQuotedMsg: wbotMessage.hasQuotedMsg,
    ack: mapMessageAck(wbotMessage.ack)
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

const convertToContactPayload = async (
  msgContact: WbotContact
): Promise<ContactPayload> => {
  const profilePicUrl = await msgContact.getProfilePicUrl();

  return {
    name: msgContact.name || msgContact.pushname || msgContact.id.user,
    number: msgContact.id.user,
    profilePicUrl,
    isGroup: msgContact.isGroup
  };
};

const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<string | undefined> => {
  if (!msg.hasQuotedMsg) return undefined;

  const wbotQuotedMsg = await msg.getQuotedMessage();
  return wbotQuotedMsg.id.id;
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

  return {
    id: processedMsg.id.id,
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

const convertToMediaPayload = async (
  msg: WbotMessage
): Promise<MediaPayload | undefined> => {
  if (!msg.hasMedia) return undefined;

  const media = await msg.downloadMedia();
  if (!media) return undefined;

  return {
    filename: media.filename || "",
    mimetype: media.mimetype,
    data: media.data
  };
};

const shouldHandleMessage = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;

  if (
    !(
      msg.type === "chat" ||
      msg.type === "audio" ||
      msg.type === "ptt" ||
      msg.type === "video" ||
      msg.type === "image" ||
      msg.type === "document" ||
      msg.type === "vcard" ||
      msg.type === "sticker" ||
      msg.type === "location"
    )
  ) {
    return false;
  }

  // Check for Unicode direction mark
  if (/\u200e/.test(msg.body[0])) return false;

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
  wbot: Session
): Promise<{
  messagePayload: MessagePayload;
  contactPayload: ContactPayload;
  contextPayload: WhatsappContextPayload;
  mediaPayload: MediaPayload | undefined;
}> => {
  let msgContact: WbotContact;
  let groupContact: ContactPayload | undefined;

  const chat = await msg.getChat();

  if (chat.isGroup) {
    msgContact = await msg.getContact();

    try {
      const groupChatId = chat.id?._serialized || msg.to;
      const groupWbotContact = await wbot.getContactById(groupChatId);
      groupContact = await convertToContactPayload(groupWbotContact);
    } catch (err) {
      logger.warn(err, "Unable to resolve group contact");
    }
  } else {
    if (msg.fromMe) {
      try {
        msgContact = await wbot.getContactById(msg.to);
      } catch (err) {
        logger.warn(err, "Unable to resolve contact by id, falling back to message contact");
        msgContact = await msg.getContact();
      }
    } else {
      msgContact = await msg.getContact();
    }
  }

  const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;

  const contactPayload = await convertToContactPayload(msgContact);
  const messagePayload = await convertToMessagePayload(msg);
  const mediaPayload = await convertToMediaPayload(msg);

  const contextPayload: WhatsappContextPayload = {
    whatsappId: wbot.id!,
    unreadMessages,
    groupContact
  };

  return {
    messagePayload,
    contactPayload,
    contextPayload,
    mediaPayload
  };
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
            } = await getMessageData(msg, wbot);

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

const removeSession = (whatsappId: number): void => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(err);
  }
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

  try {
    const sentMessage = await wbot.sendMessage(to, body, {
      quotedMessageId: quotedMsgSerializedId,
      linkPreview: options?.linkPreview
    });

    return convertToProviderMessage(sentMessage);
  } catch (err) {
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

  const messageMedia = media.path
    ? MessageMedia.fromFilePath(media.path)
    : new MessageMedia(
        media.mimetype,
        media.data?.toString("base64") || "",
        media.filename
      );

  const mediaOptions: MessageSendOptions = {
    caption: options?.caption,
    sendAudioAsVoice: options?.sendAudioAsVoice,
    quotedMessageId: options?.quotedMessageId
  };

  if (
    messageMedia.mimetype.startsWith("image/") &&
    !/^.*\.(jpe?g|png|gif)?$/i.exec(media.filename)
  ) {
    mediaOptions.sendMediaAsDocument = options?.sendMediaAsDocument || true;
  }

  const sentMessage = await wbot.sendMessage(to, messageMedia, mediaOptions);
  return convertToProviderMessage(sentMessage);
};

const checkNumber = async (
  sessionId: number,
  number: string
): Promise<string> => {
  const wbot = getWbot(sessionId);
  const validNumber = await wbot.getNumberId(`${number}@c.us`);

  return validNumber?.user || "";
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

  const serializedMsgId = getSerializedMessageId(chatId, fromMe, messageId);

  const message = await wbot.getMessageById(serializedMsgId);

  await message.delete(true);
};

const init = async (whatsapp: Whatsapp): Promise<void> => {
  try {
    removeSession(whatsapp.id);
    cleanupSessionLockFiles(whatsapp.id);

    const io = getIO();
    const sessionName = whatsapp.name;
    const sessionCfg = whatsapp?.session ? JSON.parse(whatsapp.session) : {};

    const args: string = process.env.CHROME_ARGS || "";
    const protocolTimeout = Number(
      process.env.PUPPETEER_PROTOCOL_TIMEOUT || "120000"
    );

    const wbot: Session = new Client({
      session: sessionCfg,
      authStrategy: new LocalAuth({ clientId: `bd_${whatsapp.id}` }),
      puppeteer: {
        // headless: false, // TODO make sure chromium closes on session disconnection / delete
        executablePath: process.env.CHROME_BIN || undefined,
        browserWSEndpoint: process.env.CHROME_WS || undefined,
        protocolTimeout,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          ...args.split(" ")
        ]
      }
    });

    wbot.on("qr", async qr => {
      logger.info("Session:", sessionName);
      qrCode.generate(qr, { small: true });
      await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });

      const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
      if (sessionIndex === -1) {
        wbot.id = whatsapp.id;
        sessions.push(wbot);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });

    wbot.on("authenticated", async () => {
      logger.info(`Session: ${sessionName} AUTHENTICATED`);
    });

    wbot.on("auth_failure", async msg => {
      console.error(
        `Session: ${sessionName} AUTHENTICATION FAILURE! Reason: ${msg}`
      );

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
      logger.info(`Session: ${sessionName} READY`);

      clearReconnectTimers(whatsapp.id);
      reconnectAttempts[whatsapp.id] = 0;

      try {
        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        wbot.sendPresenceAvailable();
        if (process.env.WWEBJS_SYNC_UNREAD === "true") {
          await syncUnreadMessages(wbot);
        } else {
          logger.info(
            { whatsappId: whatsapp.id },
            "Skipping unread sync on READY"
          );
        }
      } catch (err) {
        logger.error(err, "Error on whatsapp ready event");
      }
    });

    wbot.on("change_state", async newState => {
      logger.info(`Monitor session: ${sessionName}, ${newState}`);
      try {
        await whatsapp.update({ status: newState });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        if (
          ["connecting", "CONNECTING", "disconnected", "DISCONNECTED", "browser_close"].includes(
            newState
          )
        ) {
          await scheduleReconnect(whatsapp, `change_state:${newState}`);
        }
      } catch (err) {
        logger.error(err, "Error on whatsapp change state event");
      }
    });

    wbot.on("disconnected", async reason => {
      logger.info(`Disconnected session: ${sessionName}, reason: ${reason}`);
      try {
        await whatsapp.update({ status: "OPENING", session: "" });

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
    connectingTimers[whatsapp.id] = setTimeout(async () => {
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
          timeoutMs: CONNECTING_TIMEOUT_MS
        });
        await scheduleReconnect(whatsapp, "connecting_timeout");
      }
    }, CONNECTING_TIMEOUT_MS);

    wbot.on("message_create", async msg => {
      if (!shouldHandleMessage(msg)) return;

      try {
        const { messagePayload, contactPayload, contextPayload, mediaPayload } =
          await getMessageData(msg, wbot);

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

      try {
        const { messagePayload, contactPayload, contextPayload, mediaPayload } =
          await getMessageData(msg, wbot);

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
      handleMessageAck(msg.id.id, mapMessageAck(ack));
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
        killChromeProcesses();
        cleanupSessionLockFiles(whatsapp.id);
        await delay(2000 * attempt);
        await init(whatsapp);
        return;
      }
    }

    logger.error(err, "Error on whatsapp session");
    try {
      await whatsapp.update({ status: "OPENING" });
      const io = getIO();
      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
      await scheduleReconnect(whatsapp, "init_error");
    } catch (innerErr) {
      logger.error(innerErr, "Error handling whatsapp init failure");
    }
  }
};

export const WhatsappWebJsProvider: WhatsappProvider = {
  init,
  removeSession,
  logout,
  sendMessage,
  sendMedia,
  deleteMessage,
  checkNumber,
  getProfilePicUrl,
  getContacts,
  sendSeen,
  fetchChatMessages
};
