import ScanWWebJsReconciliationHistory, {
  WWebJsHistoryScannerMessage,
  WWebJsHistoryScanResult
} from "./wwebjsReconciliationHistoryScanner";

import type {
  WhatsAppReconciliationCancellationSignal
} from "../../../services/WhatsappService/WhatsAppReconciliationRuntime";

export interface WWebJsRawReconciliationMessage
  extends WWebJsHistoryScannerMessage {
  timestamp?: number;
}

export interface WWebJsRawReconciliationChat<
  TMessage extends WWebJsRawReconciliationMessage
> {
  lastMessage?: TMessage | null;

  fetchMessages(options: {
    limit: number;
  }): Promise<TMessage[]>;
}

export interface WWebJsRawReconciliationCollection<
  TMessage extends WWebJsRawReconciliationMessage
> {
  upperAnchorId: string;
  scan: WWebJsHistoryScanResult<TMessage>;
}

interface Request<
  TMessage extends WWebJsRawReconciliationMessage
> {
  chat: WWebJsRawReconciliationChat<TMessage>;

  lowerBoundAt: Date;

  signal?: WhatsAppReconciliationCancellationSignal;

  resolveMessageId: (
    message: TMessage
  ) => string;

  isKnownMessage: (
    messageId: string
  ) => Promise<boolean>;

  initialLimit?: number;
  growthFactor?: number;
  maxLimit?: number;
}

const normalizeMessageId = (
  messageId: string
): string => {
  const normalized =
    typeof messageId === "string"
      ? messageId.trim()
      : "";

  if (!normalized) {
    throw new Error(
      "ERR_INVALID_WHATSAPP_MESSAGE_ID"
    );
  }

  return normalized;
};

const resolveRawTimestamp = <
  TMessage extends WWebJsRawReconciliationMessage
>(
  message: TMessage
): number => Number(message.timestamp);

const CollectWWebJsRawReconciliationHistory = async <
  TMessage extends WWebJsRawReconciliationMessage
>({
  chat,
  lowerBoundAt,
  signal,
  resolveMessageId,
  isKnownMessage,
  initialLimit,
  growthFactor,
  maxLimit
}: Request<TMessage>): Promise<
  WWebJsRawReconciliationCollection<TMessage>
> => {
  signal?.throwIfAborted();
  /*
   * Capture the provider upper anchor BEFORE progressive
   * history collection begins.
   *
   * Messages that arrive after this point must remain outside
   * the current reconciliation run.
   */
  const upperAnchor = chat.lastMessage;

  if (!upperAnchor) {
    throw new Error(
      "ERR_RECONCILIATION_CHAT_WITHOUT_UPPER_ANCHOR"
    );
  }

  const upperAnchorId =
    normalizeMessageId(
      resolveMessageId(upperAnchor)
    );

  const scan =
    await ScanWWebJsReconciliationHistory({
      upperAnchorId,
      lowerBoundAt,

      fetchMessages: async limit => {
        signal?.throwIfAborted();

        const messages =
          await chat.fetchMessages({ limit });

        signal?.throwIfAborted();

        return messages;
      },

      resolveMessageId,
      resolveRawMessageTimestamp:
        resolveRawTimestamp,

      isKnownMessage: async messageId => {
        signal?.throwIfAborted();

        const known =
          await isKnownMessage(messageId);

        signal?.throwIfAborted();

        return known;
      },

      initialLimit,
      growthFactor,
      maxLimit
    });

  signal?.throwIfAborted();

  return {
    upperAnchorId,
    scan
  };
};

export default CollectWWebJsRawReconciliationHistory;