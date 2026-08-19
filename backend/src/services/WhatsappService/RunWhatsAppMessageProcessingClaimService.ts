import ClassifyWhatsAppReconciliationMessageService, {
  WhatsAppReconciliationMessageClassification
} from "./ClassifyWhatsAppReconciliationMessageService";

import {
  runWithWhatsAppMessageProcessingClaimGuard,
  WhatsAppMessageProcessingClaimCancellationSignal
} from "./WhatsAppMessageProcessingClaimStore";

export interface WhatsAppMessageProcessingClaimExecutionResult<T> {
  messageId: string;
  classification: WhatsAppReconciliationMessageClassification;
  messageProcessed: boolean;
  result?: T;
}

interface Request<T> {
  whatsappId: number;
  messageId: string;

  task: (
    signal: WhatsAppMessageProcessingClaimCancellationSignal
  ) => Promise<T>;
}

const normalizeMessageId = (messageId: string): string => {
  const normalized =
    typeof messageId === "string"
      ? messageId.trim()
      : "";

  if (!normalized) {
    throw new Error("ERR_INVALID_WHATSAPP_MESSAGE_ID");
  }

  return normalized;
};

const RunWhatsAppMessageProcessingClaimService = async <T>({
  whatsappId,
  messageId,
  task
}: Request<T>): Promise<
  WhatsAppMessageProcessingClaimExecutionResult<T>
> => {
  const normalizedMessageId =
    normalizeMessageId(messageId);

  return runWithWhatsAppMessageProcessingClaimGuard({
    whatsappId,
    messageId: normalizedMessageId,

    task: async signal => {
      /*
       * This is the durable TOCTOU recheck.
       *
       * The Message.id lookup happens only after distributed
       * ownership has been acquired and while its heartbeat is
       * active.
       */
      signal.throwIfAborted();

      const classification =
        await ClassifyWhatsAppReconciliationMessageService(
          normalizedMessageId
        );

      signal.throwIfAborted();

      if (classification === "existing") {
        return {
          messageId: normalizedMessageId,
          classification,
          messageProcessed: false
        };
      }

      const result = await task(signal);

      signal.throwIfAborted();

      return {
        messageId: normalizedMessageId,
        classification,
        messageProcessed: true,
        result
      };
    }
  });
};

export default RunWhatsAppMessageProcessingClaimService;