import type {
  WhatsAppReconciliationCancellationSignal
} from "../../../services/WhatsappService/WhatsAppReconciliationRuntime";

import type {
  WhatsAppReconciliationContactWorkItem,
  WhatsAppReconciliationMessageWorkItem,
  WhatsAppReconciliationWork
} from "../../../services/WhatsappService/RunWhatsAppReconciliationService";

export interface WWebJsReconciliationRunBoundary {
  lowerBoundAt: Date;
  checkpointCandidateAt: Date;
}

interface ResolveBoundaryRequest {
  existingCheckpointAt: Date | null;
  capturedBoundaryAt: Date;
}

interface CollectChatWorkRequest<TChat> {
  chat: TChat;
  chatId: string;
  lowerBoundAt: Date;
  signal: WhatsAppReconciliationCancellationSignal;
}

interface SaveCheckpointRequest {
  whatsappId: number;
  checkpointCandidateAt: Date;
  signal: WhatsAppReconciliationCancellationSignal;
}

export interface WWebJsReconciliationOrchestratorDependencies<
  TChat = unknown,
  TContact = unknown
> {
  captureBoundaryAt: () => Date;

  loadCheckpointAt: (
    whatsappId: number,
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<Date | null>;

  resolveBoundary: (
    request: ResolveBoundaryRequest,
    signal: WhatsAppReconciliationCancellationSignal
  ) =>
    | WWebJsReconciliationRunBoundary
    | Promise<WWebJsReconciliationRunBoundary>;

  listChats: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<TChat[]>;

  getChatId: (chat: TChat) => string | null | undefined;

  isEligibleChat: (
    chat: TChat,
    chatId: string
  ) => boolean;

  collectChatWork: (
    request: CollectChatWorkRequest<TChat>
  ) => Promise<WhatsAppReconciliationMessageWorkItem[]>;

  listContacts: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<TContact[]>;

  mapContact: (
    contact: TContact,
    signal: WhatsAppReconciliationCancellationSignal
  ) =>
    | WhatsAppReconciliationContactWorkItem
    | null
    | undefined
    | Promise<
        | WhatsAppReconciliationContactWorkItem
        | null
        | undefined
      >;

  getContactIdentityKey: (
    contact: WhatsAppReconciliationContactWorkItem
  ) => string | null | undefined;

  saveCheckpoint: (
    request: SaveCheckpointRequest
  ) => Promise<void>;
}

interface CreateRequest<TChat, TContact> {
  whatsappId: number;

  dependencies:
    WWebJsReconciliationOrchestratorDependencies<
      TChat,
      TContact
    >;
}

export interface WWebJsReconciliationOrchestrator {
  collectWork: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<WhatsAppReconciliationWork>;

  finalizeWork: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<void>;
}

const normalizeIdentityKey = (
  value: string | null | undefined
): string | null => {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  return normalized || null;
};

const assertValidDate = (
  value: Date,
  field: string
): Date => {
  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new Error(
      `ERR_INVALID_WHATSAPP_RECONCILIATION_${field}`
    );
  }

  return value;
};

export const createWWebJsReconciliationOrchestrator = <
  TChat = unknown,
  TContact = unknown
>({
  whatsappId,
  dependencies
}: CreateRequest<TChat, TContact>): WWebJsReconciliationOrchestrator => {
  let checkpointCandidateAt: Date | null = null;
  let collectionCompleted = false;

  const collectWork = async (
    signal: WhatsAppReconciliationCancellationSignal
  ): Promise<WhatsAppReconciliationWork> => {
    /*
     * Reset run-local mutable state first so a failed second
     * collection can never reuse a prior successful candidate.
     */
    checkpointCandidateAt = null;
    collectionCompleted = false;

    signal.throwIfAborted();

    const capturedBoundaryAt =
      assertValidDate(
        dependencies.captureBoundaryAt(),
        "CAPTURED_BOUNDARY"
      );

    signal.throwIfAborted();

    const existingCheckpointAt =
      await dependencies.loadCheckpointAt(
        whatsappId,
        signal
      );

    signal.throwIfAborted();

    const boundary =
      await dependencies.resolveBoundary(
        {
          existingCheckpointAt,
          capturedBoundaryAt
        },
        signal
      );

    const lowerBoundAt =
      assertValidDate(
        boundary.lowerBoundAt,
        "LOWER_BOUND"
      );

    const resolvedCheckpointCandidateAt =
      assertValidDate(
        boundary.checkpointCandidateAt,
        "CHECKPOINT_CANDIDATE"
      );

    signal.throwIfAborted();

    /*
     * Chat fan-out occurs only after the run-scoped boundary
     * has been resolved exactly once.
     */
    const chats =
      await dependencies.listChats(signal);

    signal.throwIfAborted();

    const seenChatIds = new Set<string>();

    const messages:
      WhatsAppReconciliationMessageWorkItem[] = [];

    for (const chat of chats) {
      signal.throwIfAborted();

      const chatId =
        normalizeIdentityKey(
          dependencies.getChatId(chat)
        );

      if (!chatId || seenChatIds.has(chatId)) {
        continue;
      }

      seenChatIds.add(chatId);

      if (
        !dependencies.isEligibleChat(
          chat,
          chatId
        )
      ) {
        continue;
      }

      const chatMessages =
        await dependencies.collectChatWork({
          chat,
          chatId,
          lowerBoundAt,
          signal
        });

      signal.throwIfAborted();

      messages.push(...chatMessages);
    }

    /*
     * Contacts are part of the same run because P05 requires
     * contact reconciliation independent of message history.
     * A failure here fails the collection and therefore prevents
     * checkpoint advancement.
     */
    const providerContacts =
      await dependencies.listContacts(signal);

    signal.throwIfAborted();

    const seenContactKeys =
      new Set<string>();

    const contacts:
      WhatsAppReconciliationContactWorkItem[] = [];

    for (const providerContact of providerContacts) {
      signal.throwIfAborted();

      const mapped =
        await dependencies.mapContact(
          providerContact,
          signal
        );

      signal.throwIfAborted();

      if (!mapped) {
        continue;
      }

      const identityKey =
        normalizeIdentityKey(
          dependencies.getContactIdentityKey(
            mapped
          )
        );

      if (
        !identityKey ||
        seenContactKeys.has(identityKey)
      ) {
        continue;
      }

      seenContactKeys.add(identityKey);
      contacts.push(mapped);
    }

    signal.throwIfAborted();

    /*
     * Candidate becomes publishable only after full collection.
     * No durable write happens here.
     */
    checkpointCandidateAt =
      resolvedCheckpointCandidateAt;

    collectionCompleted = true;

    return {
      messages,
      contacts
    };
  };

  const finalizeWork = async (
    signal: WhatsAppReconciliationCancellationSignal
  ): Promise<void> => {
    signal.throwIfAborted();

    if (
      !collectionCompleted ||
      !checkpointCandidateAt
    ) {
      throw new Error(
        "ERR_WHATSAPP_RECONCILIATION_NOT_READY_TO_FINALIZE"
      );
    }

    await dependencies.saveCheckpoint({
      whatsappId,
      checkpointCandidateAt,
      signal
    });

    signal.throwIfAborted();
  };

  return {
    collectWork,
    finalizeWork
  };
};

export default createWWebJsReconciliationOrchestrator;