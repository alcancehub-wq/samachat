import ReconcileWhatsAppContactMetadataService, {
  WhatsAppReconciliationContactMetadata
} from "./ReconcileWhatsAppContactMetadataService";

import ReconcileWhatsAppMessageService from "./ReconcileWhatsAppMessageService";

import {
  runWithWhatsAppReconciliationGuard,
  WhatsAppReconciliationCancellationSignal,
  WhatsAppReconciliationResult,
  WhatsAppReconciliationTrigger
} from "./WhatsAppReconciliationRuntime";

export interface WhatsAppReconciliationMessageWorkItem {
  messageId: string;
  metadata: WhatsAppReconciliationContactMetadata;
  processNewMessage: () => Promise<void>;
}

export interface WhatsAppReconciliationContactWorkItem {
  metadata: WhatsAppReconciliationContactMetadata;
}

export interface WhatsAppReconciliationWork {
  messages?: WhatsAppReconciliationMessageWorkItem[];
  contacts?: WhatsAppReconciliationContactWorkItem[];
}

interface Request {
  whatsappId: number;
  trigger: WhatsAppReconciliationTrigger;

  messages?: WhatsAppReconciliationMessageWorkItem[];
  contacts?: WhatsAppReconciliationContactWorkItem[];

  collectWork?: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<WhatsAppReconciliationWork>;

  finalizeWork?: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<void>;
}

const normalizeWhatsappId = (whatsappId: number): number => {
  const normalized = Number(whatsappId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }

  return normalized;
};

const RunWhatsAppReconciliationService = async ({
  whatsappId,
  trigger,
  messages = [],
  contacts = [],
  collectWork,
  finalizeWork
}: Request): Promise<WhatsAppReconciliationResult> => {
  const normalizedWhatsappId =
    normalizeWhatsappId(whatsappId);

  return runWithWhatsAppReconciliationGuard({
    whatsappId: normalizedWhatsappId,
    trigger,

    task: async signal => {
      const startedAt = new Date();

      signal.throwIfAborted();

      /*
       * Provider collection must run INSIDE the distributed
       * connection lock. This prevents concurrent READY/manual
       * reconciliations from duplicating expensive history,
       * contact or media preparation before the guard.
       */
      const collectedWork = collectWork
        ? await collectWork(signal)
        : undefined;

      signal.throwIfAborted();

      const resolvedContacts = [
        ...contacts,
        ...(collectedWork?.contacts || [])
      ];

      const resolvedMessages = [
        ...messages,
        ...(collectedWork?.messages || [])
      ];

      let checkedMessages = 0;
      let importedMessages = 0;
      let existingMessages = 0;
      let skippedMessages = 0;

      let contactsChecked = 0;
      let contactsCreated = 0;
      let contactsUpdated = 0;

      const reconciledContactIdentities =
        new Set<string>();

      const reconcileContactMetadataOnce =
        async (
          metadata: WhatsAppReconciliationContactMetadata
        ): Promise<void> => {
          signal.throwIfAborted();

          const normalizedNumber =
            typeof metadata.number === "string"
              ? metadata.number.trim()
              : "";

          const normalizedLid =
            typeof metadata.lid === "string"
              ? metadata.lid.trim()
              : "";

          const identityKey =
            normalizedNumber
              ? `number:${normalizedNumber}`
              : normalizedLid
                ? `lid:${normalizedLid}`
                : undefined;

          if (
            identityKey &&
            reconciledContactIdentities.has(identityKey)
          ) {
            return;
          }

          await ReconcileWhatsAppContactMetadataService({
            whatsappId: normalizedWhatsappId,
            metadata,
            signal
          });

          if (identityKey) {
            reconciledContactIdentities.add(identityKey);
          }

          contactsChecked += 1;
        };

      for (const contactItem of resolvedContacts) {
        await reconcileContactMetadataOnce(
          contactItem.metadata
        );
      }

      for (const messageItem of resolvedMessages) {
        signal.throwIfAborted();

        checkedMessages += 1;

        const result =
          await ReconcileWhatsAppMessageService({
            whatsappId: normalizedWhatsappId,
            messageId: messageItem.messageId,
            signal,

            reconcileMetadata: async () => {
              signal.throwIfAborted();

              await reconcileContactMetadataOnce(
                messageItem.metadata
              );
            },

            processNewMessage:
              messageItem.processNewMessage
          });

        if (result.classification === "existing") {
          existingMessages += 1;
        } else if (result.messageProcessed) {
          importedMessages += 1;
        } else {
          skippedMessages += 1;
        }
      }
      signal.throwIfAborted();

      if (finalizeWork) {
        await finalizeWork(signal);
        signal.throwIfAborted();
      }

      return {
        whatsappId: normalizedWhatsappId,
        trigger,
        checkedMessages,
        importedMessages,
        existingMessages,
        skippedMessages,
        contactsChecked,
        contactsCreated,
        contactsUpdated,
        startedAt,
        finishedAt: new Date()
      };
    }
  });
};

export default RunWhatsAppReconciliationService;
