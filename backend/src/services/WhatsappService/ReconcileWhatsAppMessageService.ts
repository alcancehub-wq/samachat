import {
  WhatsAppReconciliationMessageClassification
} from "./ClassifyWhatsAppReconciliationMessageService";

import RunWhatsAppMessageProcessingClaimService from "./RunWhatsAppMessageProcessingClaimService";

import {
  WhatsAppReconciliationCancellationSignal
} from "./WhatsAppReconciliationRuntime";

export interface ReconcileWhatsAppMessageResult {
  messageId: string;
  classification: WhatsAppReconciliationMessageClassification;
  metadataReconciled: boolean;
  messageProcessed: boolean;
}

interface Request {
  whatsappId: number;
  messageId: string;
  signal: WhatsAppReconciliationCancellationSignal;

  reconcileMetadata: () => Promise<void>;

  processNewMessage: () => Promise<void>;
}

const normalizeWhatsappId = (
  whatsappId: number
): number => {
  const normalized = Number(whatsappId);

  if (
    !Number.isInteger(normalized) ||
    normalized <= 0
  ) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }

  return normalized;
};

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

const ReconcileWhatsAppMessageService = async ({
  whatsappId,
  messageId,
  signal,
  reconcileMetadata,
  processNewMessage
}: Request): Promise<
  ReconcileWhatsAppMessageResult
> => {
  const normalizedWhatsappId =
    normalizeWhatsappId(whatsappId);

  const normalizedMessageId =
    normalizeMessageId(messageId);

  signal.throwIfAborted();

  /*
   * Contact/name/photo/LID reconciliation remains independent
   * from message persistence and from the per-message claim.
   *
   * Even when Message.id already exists, metadata may still be
   * safely enriched by its dedicated reconciliation path.
   */
  await reconcileMetadata();

  signal.throwIfAborted();

  /*
   * The durable Message.id decision that controls inbound side
   * effects now happens only after the distributed per-message
   * claim is acquired.
   *
   * This closes the stale pre-claim classification TOCTOU window.
   */
  const claimResult =
    await RunWhatsAppMessageProcessingClaimService({
      whatsappId: normalizedWhatsappId,
      messageId: normalizedMessageId,

      task: async claimSignal => {
        signal.throwIfAborted();
        claimSignal.throwIfAborted();

        await processNewMessage();

        signal.throwIfAborted();
        claimSignal.throwIfAborted();
      }
    });

  signal.throwIfAborted();

  return {
    messageId: normalizedMessageId,
    classification:
      claimResult.classification,
    metadataReconciled: true,
    messageProcessed:
      claimResult.messageProcessed
  };
};

export default ReconcileWhatsAppMessageService;