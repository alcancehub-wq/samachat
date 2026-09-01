import {
  ContactPayload,
  MessagePayload,
  WhatsappContextPayload
} from "../../handlers/handleWhatsappEvents";

interface CloudApiContact {
  profile?: {
    name?: string;
  };
  wa_id?: string;
}

export type CloudApiInboundMediaType =
  | "audio"
  | "image"
  | "video"
  | "document";

interface CloudApiMediaObject {
  id?: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

interface CloudApiMessage {
  id?: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  audio?: CloudApiMediaObject;
  image?: CloudApiMediaObject;
  video?: CloudApiMediaObject;
  document?: CloudApiMediaObject;
}

interface CloudApiChangeValue {
  contacts?: CloudApiContact[];
  messages?: CloudApiMessage[];
  message_echoes?: CloudApiMessage[];
  metadata?: {
    phone_number_id?: string;
    display_phone_number?: string;
  };
}

interface CloudApiChange {
  value?: CloudApiChangeValue;
  field?: string;
}

interface CloudApiEntry {
  changes?: CloudApiChange[];
}

export interface CloudApiWebhookPayload {
  object?: string;
  entry?: CloudApiEntry[];
}

export interface NormalizedCloudApiMedia {
  id: string;
  type: CloudApiInboundMediaType;
  mimetype?: string;
  filename?: string;
  caption?: string;
}

export interface NormalizedCloudApiMessage {
  contactPayload: ContactPayload;
  messagePayload: MessagePayload;
  contextPayload: WhatsappContextPayload;
  cloudMedia?: NormalizedCloudApiMedia;
  isCoexistenceMessageEcho?: boolean;
}

const resolveContactName = (
  contact: CloudApiContact | undefined,
  fallbackNumber: string
): string => {
  return contact?.profile?.name || fallbackNumber;
};

const findContact = (
  contacts: CloudApiContact[] | undefined,
  waId: string
): CloudApiContact | undefined => {
  return (contacts || []).find(contact => contact.wa_id === waId);
};

const normalizeTimestamp = (timestamp?: string): number => {
  const parsed = Number(timestamp || 0);

  if (!parsed || Number.isNaN(parsed)) {
    return Math.floor(Date.now() / 1000);
  }

  return parsed;
};

const resolveMedia = (
  message: CloudApiMessage
): NormalizedCloudApiMedia | undefined => {
  const supportedTypes: CloudApiInboundMediaType[] = [
    "audio",
    "image",
    "video",
    "document"
  ];

  if (
    !message.type ||
    !supportedTypes.includes(message.type as CloudApiInboundMediaType)
  ) {
    return undefined;
  }

  const type = message.type as CloudApiInboundMediaType;
  const media = message[type];

  if (!media?.id) {
    return undefined;
  }

  return {
    id: media.id,
    type,
    mimetype: media.mime_type,
    filename: media.filename,
    caption: media.caption
  };
};

const NormalizeCloudApiWebhook = (
  payload: CloudApiWebhookPayload,
  whatsappId: number
): NormalizedCloudApiMessage[] => {
  const normalizedMessages: NormalizedCloudApiMessage[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;

      if (!value) {
        continue;
      }

      const isMessageEchoChange =
        change.field === "smb_message_echoes";

      const messages = isMessageEchoChange
        ? value.message_echoes
        : value.messages;

      if (!Array.isArray(messages)) {
        continue;
      }

      for (const message of messages) {
        if (!message.from) {
          continue;
        }

        const providerTimestamp = Number(message.timestamp || 0);
        if (
          isMessageEchoChange &&
          (!message.id || !providerTimestamp || Number.isNaN(providerTimestamp))
        ) {
          continue;
        }

        const isText =
          message.type === "text" &&
          typeof message.text?.body === "string" &&
          message.text.body.length > 0;

        const cloudMedia = resolveMedia(message);

        if (!isText && !cloudMedia) {
          continue;
        }

        const customerNumber = isMessageEchoChange
          ? message.to || ""
          : message.from;

        if (!customerNumber) {
          continue;
        }

        const contact = findContact(value.contacts, customerNumber);
        const contactName = resolveContactName(contact, customerNumber);
        const fromChatId = `${message.from}@c.us`;
        const toChatId = isMessageEchoChange
          ? `${customerNumber}@c.us`
          : value.metadata?.phone_number_id
            ? `${value.metadata.phone_number_id}@c.us`
            : "";

        const body = isText
          ? message.text?.body || ""
          : cloudMedia?.caption || cloudMedia?.filename || "";

        normalizedMessages.push({
          contactPayload: {
            name: contactName,
            number: customerNumber,
            isGroup: false
          },
          messagePayload: {
            id:
              message.id ||
              `cloudapi-${message.from}-${message.timestamp}`,
            body,
            fromMe: isMessageEchoChange,
            hasMedia: Boolean(cloudMedia),
            type: cloudMedia
              ? (cloudMedia.type as any)
              : ("chat" as any),
            timestamp: isMessageEchoChange
              ? providerTimestamp
              : normalizeTimestamp(message.timestamp),
            from: fromChatId,
            to: toChatId,
            ack: 0
          },
          contextPayload: {
            whatsappId,
            unreadMessages: isMessageEchoChange ? 0 : 1
          },
          ...(isMessageEchoChange
            ? { isCoexistenceMessageEcho: true }
            : {}),
          ...(cloudMedia ? { cloudMedia } : {})
        });
      }
    }
  }

  return normalizedMessages;
};

export default NormalizeCloudApiWebhook;