import type { MessageDirection } from '@prisma/client';

export interface NormalizedMessage {
  phoneNumber: string;
  messageText: string | null;
  messageType: string;
  externalId: string;
  timestamp: Date;
  direction: MessageDirection;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaMime?: string | null;
  mediaSize?: number | null;
  mediaFileName?: string | null;
  mediaExtension?: string | null;
}

export interface MessageEventPayload {
  tenant_id?: string;
  conversation_id: string;
  contact_id: string;
  message_id: string;
  direction: MessageDirection;
  content: string | null;
  type?: string;
  media_url?: string | null;
  media_mime?: string | null;
  media_size?: number | null;
  timestamp: string;
}
