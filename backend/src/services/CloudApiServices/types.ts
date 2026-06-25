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
