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

interface CloudApiTextMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
}

interface CloudApiChangeValue {
  contacts?: CloudApiContact[];
  messages?: CloudApiTextMessage[];
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

export interface NormalizedCloudApiTextMessage {
  contactPayload: ContactPayload;
  messagePayload: MessagePayload;
  contextPayload: WhatsappContextPayload;
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

const NormalizeCloudApiWebhook = (
  payload: CloudApiWebhookPayload,
  whatsappId: number
): NormalizedCloudApiTextMessage[] => {
  const normalizedMessages: NormalizedCloudApiTextMessage[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;

      if (!value || !Array.isArray(value.messages)) {
        continue;
      }

      for (const message of value.messages) {
        if (message.type !== "text" || !message.text?.body || !message.from) {
          continue;
        }

        const contact = findContact(value.contacts, message.from);
        const contactName = resolveContactName(contact, message.from);
        const fromChatId = `${message.from}@c.us`;
        const toChatId = value.metadata?.phone_number_id
          ? `${value.metadata.phone_number_id}@c.us`
          : "";

        normalizedMessages.push({
          contactPayload: {
            name: contactName,
            number: message.from,
            isGroup: false
          },
          messagePayload: {
            id: message.id || `cloudapi-${message.from}-${message.timestamp}`,
            body: message.text.body,
            fromMe: false,
            hasMedia: false,
            type: "chat" as any,
            timestamp: normalizeTimestamp(message.timestamp),
            from: fromChatId,
            to: toChatId,
            ack: 0
          },
          contextPayload: {
            whatsappId,
            unreadMessages: 1
          }
        });
      }
    }
  }

  return normalizedMessages;
};

export default NormalizeCloudApiWebhook;
