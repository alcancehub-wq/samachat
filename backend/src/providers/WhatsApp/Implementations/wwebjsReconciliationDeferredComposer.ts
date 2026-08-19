import {
  WhatsAppReconciliationMessageWorkItem
} from "../../../services/WhatsappService/RunWhatsAppReconciliationService";

type ReconciliationMetadata =
  WhatsAppReconciliationMessageWorkItem["metadata"];

interface Request<TMessage> {
  messages: TMessage[];

  resolveMessageId: (
    message: TMessage
  ) => string;

  resolveMetadata: (
    message: TMessage
  ) => Promise<ReconciliationMetadata>;

  processNewMessage: (
    message: TMessage
  ) => Promise<void>;
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

/**
 * Converts raw provider messages into the minimal work-item
 * contract consumed by RunWhatsAppReconciliationService.
 *
 * Important:
 * - resolving metadata is allowed during composition;
 * - processNewMessage is NEVER executed during composition;
 * - the returned closure preserves the original raw message
 *   object and invokes processNewMessage only when called later;
 * - therefore getMessageData/media work can remain behind the
 *   distributed Message claim owned by Reconcile -> T1.
 */
const ComposeWWebJsDeferredReconciliationMessages = async <
  TMessage
>({
  messages,
  resolveMessageId,
  resolveMetadata,
  processNewMessage
}: Request<TMessage>): Promise<
  WhatsAppReconciliationMessageWorkItem[]
> => {
  if (!Array.isArray(messages)) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_MESSAGES"
    );
  }

  const workItems:
    WhatsAppReconciliationMessageWorkItem[] =
      [];

  for (const rawMessage of messages) {
    const messageId =
      normalizeMessageId(
        resolveMessageId(rawMessage)
      );

    const metadata =
      await resolveMetadata(rawMessage);

    workItems.push({
      messageId,
      metadata,

      processNewMessage: async () => {
        await processNewMessage(rawMessage);
      }
    });
  }

  return workItems;
};

export default ComposeWWebJsDeferredReconciliationMessages;