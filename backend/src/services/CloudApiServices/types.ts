export interface CloudApiCredentials {
  accessToken?: string | null;
  phoneNumberId?: string | null;
  apiVersion?: string | null;
}

export interface CloudApiTextMessageInput {
  to: string;
  body: string;
  previewUrl?: boolean;
}
export interface CloudApiTemplateMessageInput {
  to: string;
  name: string;
  languageCode: string;
  components?: Array<Record<string, unknown>>;
}

export type CloudApiMediaType =
  | "audio"
  | "image"
  | "video"
  | "document";

export interface CloudApiMediaUploadInput {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export interface CloudApiMediaUploadResult {
  id?: string;
}

export interface CloudApiMediaMessageInput {
  to: string;
  mediaId: string;
  type: CloudApiMediaType;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

export interface CloudApiMessageResult {
  messagingProduct?: string;
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
    message_status?: string;
  }>;
}

export interface CloudApiErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface CloudApiHttpResponse {
  statusCode: number;
  body: string;
}
