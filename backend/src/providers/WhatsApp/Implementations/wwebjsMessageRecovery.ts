import type { ContactPayload } from "../../../handlers/handleWhatsappEvents";
import type { ProviderMessage } from "../types";
import type { WbotGroupContextChat } from "./wwebjsGroupContext";

type RawMessageData = {
  id?: {
    remote?: string;
    _serialized?: string;
  };
  from?: string;
  to?: string;
  notifyName?: string;
  pushname?: string;
  sender?: {
    name?: string;
    pushname?: string;
  };
};

export type WwebjsRecoverableMessage = {
  from?: string;
  to?: string;
  fromMe?: boolean;
  _data?: RawMessageData;
  getChat?: () => Promise<any>;
  getContact?: () => Promise<any>;
};

type LoggerLike = {
  warn: (...args: any[]) => unknown;
};

type WwebjsContactClient = {
  getContactById: (contactId: string) => Promise<any>;
};

type ConvertContactPayload = (contact: any) => Promise<ContactPayload>;

export type WwebjsRecoveredChat = WbotGroupContextChat & {
  unreadCount?: number;
};

const firstNonEmptyString = (
  ...values: Array<string | null | undefined>
): string =>
  values.find(
    value => typeof value === "string" && value.trim().length > 0
  )?.trim() || "";

const normalizeDigits = (value?: string): string =>
  value ? value.replace(/\D/g, "") : "";

export const resolveWwebjsRemoteId = (
  msg: WwebjsRecoverableMessage
): string => {
  const raw = msg._data || {};

  const primaryCandidates = msg.fromMe
    ? [
        msg.to,
        raw.to,
        raw.id?.remote,
        raw.id?._serialized
      ]
    : [
        msg.from,
        raw.from,
        raw.id?.remote,
        raw.id?._serialized
      ];

  const secondaryCandidates = msg.fromMe
    ? [msg.from, raw.from]
    : [msg.to, raw.to];

  return firstNonEmptyString(
    ...primaryCandidates,
    ...secondaryCandidates
  );
};

export const buildWwebjsFallbackContactPayload = (
  msg: WwebjsRecoverableMessage
): ContactPayload => {
  const remoteId = resolveWwebjsRemoteId(msg);
  const raw = msg._data || {};

  const rawUser = remoteId.includes("@")
    ? remoteId.split("@")[0]
    : remoteId;

  const digits = normalizeDigits(rawUser);
  const isLid = /@lid$/i.test(remoteId);
  const isGroup = /@g\.us$/i.test(remoteId);

  const incomingProfileName = msg.fromMe
    ? ""
    : firstNonEmptyString(
        raw.notifyName,
        raw.pushname,
        raw.sender?.pushname,
        raw.sender?.name
      );

  const name =
    incomingProfileName ||
    digits ||
    rawUser ||
    "WhatsApp Contact";

  return {
    name,
    number: isLid ? "" : digits,
    lid: isLid
      ? remoteId.includes("@")
        ? remoteId
        : `${digits}@lid`
      : undefined,
    profilePicUrl: undefined,
    isGroup
  };
};

export const buildWwebjsFallbackChat = (
  msg: WwebjsRecoverableMessage
): WwebjsRecoveredChat => {
  const remoteId = resolveWwebjsRemoteId(msg);
  const fallbackContact = buildWwebjsFallbackContactPayload(msg);

  return {
    isGroup: fallbackContact.isGroup,
    id: {
      _serialized: remoteId
    },
    name: fallbackContact.name,
    formattedTitle: fallbackContact.name,
    unreadCount: msg.fromMe ? 0 : 1
  };
};

export const resolveWwebjsChatWithFallback = async (
  msg: WwebjsRecoverableMessage,
  logger: LoggerLike
): Promise<WwebjsRecoveredChat> => {
  try {
    if (msg.getChat) {
      const chat = await msg.getChat();

      if (chat) {
        return chat as WwebjsRecoveredChat;
      }
    }
  } catch (err) {
    logger.warn(
      {
        err,
        remoteId: resolveWwebjsRemoteId(msg),
        fromMe: Boolean(msg.fromMe)
      },
      "Unable to resolve WhatsApp chat, using message fallback"
    );
  }

  return buildWwebjsFallbackChat(msg);
};

export const resolveWwebjsContactPayloadWithFallback = async ({
  msg,
  wbot,
  convertContactPayload,
  logger
}: {
  msg: WwebjsRecoverableMessage;
  wbot: WwebjsContactClient;
  convertContactPayload: ConvertContactPayload;
  logger: LoggerLike;
}): Promise<ContactPayload> => {
  const remoteId = resolveWwebjsRemoteId(msg);
  let providerContact: any;

  if (msg.fromMe && remoteId) {
    try {
      providerContact = await wbot.getContactById(remoteId);
    } catch (err) {
      logger.warn(
        {
          err,
          remoteId
        },
        "Unable to resolve outgoing contact by id"
      );
    }
  }

  if (!providerContact && msg.getContact) {
    try {
      providerContact = await msg.getContact();
    } catch (err) {
      logger.warn(
        {
          err,
          remoteId,
          fromMe: Boolean(msg.fromMe)
        },
        "Unable to resolve message contact"
      );
    }
  }

  if (providerContact) {
    try {
      return await convertContactPayload(providerContact);
    } catch (err) {
      logger.warn(
        {
          err,
          remoteId
        },
        "Unable to convert provider contact, using message fallback"
      );
    }
  }

  return buildWwebjsFallbackContactPayload(msg);
};

export const buildAcceptedWwebjsProviderMessage = ({
  sessionId,
  to,
  body
}: {
  sessionId: number;
  to: string;
  body: string;
}): ProviderMessage => ({
  id: `wwebjs-accepted-${sessionId}-${Date.now()}`,
  body,
  fromMe: true,
  hasMedia: false,
  type: "chat",
  timestamp: Math.floor(Date.now() / 1000),
  from: "",
  to,
  hasQuotedMsg: false,
  ack: 0
});
