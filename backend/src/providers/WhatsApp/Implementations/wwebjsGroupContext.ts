import type { ContactPayload } from "../../../handlers/handleWhatsappEvents";

const GROUP_CHAT_SUFFIX = "@g.us";

type WbotRawMessageData = {
  id?: {
    remote?: string;
    _serialized?: string;
  };
  from?: string;
  to?: string;
  author?: string;
};

export type WbotGroupContextSource = {
  from: string;
  to: string;
  author?: string;
  _data?: WbotRawMessageData;
};

export type WbotGroupContextChat = {
  isGroup?: boolean;
  id?: {
    _serialized?: string;
  };
  name?: string;
  formattedTitle?: string;
};

const isGroupChatId = (value?: string | null): value is string => {
  return typeof value === "string" && value.endsWith(GROUP_CHAT_SUFFIX);
};

const buildFallbackGroupContactPayload = (
  groupChatId: string | undefined,
  chat?: WbotGroupContextChat
): ContactPayload => {
  const groupNumber = groupChatId?.split("@")[0] || "";
  const groupName =
    chat?.name || chat?.formattedTitle || groupNumber || "WhatsApp Group";

  return {
    name: groupName,
    number: groupNumber,
    isGroup: true
  };
};

export const deriveWwebjsGroupContext = (
  msg: WbotGroupContextSource,
  chat?: WbotGroupContextChat
): {
  isGroupMessage: boolean;
  groupChatId?: string;
  fallbackContactPayload?: ContactPayload;
} => {
  const raw = msg._data || {};
  const groupChatId = [
    chat?.id?._serialized,
    msg.from,
    msg.to,
    msg.author,
    raw.id?._serialized,
    raw.id?.remote,
    raw.from,
    raw.to,
    raw.author
  ].find(isGroupChatId);

  const isGroupMessage = Boolean(chat?.isGroup || groupChatId);

  if (!isGroupMessage) {
    return { isGroupMessage: false };
  }

  return {
    isGroupMessage: true,
    groupChatId,
    fallbackContactPayload: buildFallbackGroupContactPayload(groupChatId, chat)
  };
};