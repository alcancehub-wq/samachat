import { ProviderMessage } from "../types";

type WwebjsMessageLike = {
  id?: {
    id?: string;
  };
  body?: string;
  fromMe?: boolean;
  hasMedia?: boolean;
  type?: unknown;
  timestamp?: number;
  from?: string;
  to?: string;
  hasQuotedMsg?: boolean;
  ack?: number;
};

interface BuildAcceptedMessageFallbackRequest {
  sessionId: number;
  to: string;
  body: string;
  sentMessage?: WwebjsMessageLike | null;
}

const BuildAcceptedWwebjsMessageResult = ({
  sessionId,
  to,
  body,
  sentMessage
}: BuildAcceptedMessageFallbackRequest): ProviderMessage => {
  if (sentMessage?.id?.id) {
    return {
      id: sentMessage.id.id,
      body: sentMessage.body || body,
      fromMe: sentMessage.fromMe ?? true,
      hasMedia: sentMessage.hasMedia ?? false,
      type: (sentMessage.type || "chat") as any,
      timestamp:
        sentMessage.timestamp || Math.floor(Date.now() / 1000),
      from: sentMessage.from || "",
      to: sentMessage.to || to,
      hasQuotedMsg: sentMessage.hasQuotedMsg ?? false,
      ack: (sentMessage.ack ?? 0) as any
    };
  }

  return {
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
  };
};

export default BuildAcceptedWwebjsMessageResult;
