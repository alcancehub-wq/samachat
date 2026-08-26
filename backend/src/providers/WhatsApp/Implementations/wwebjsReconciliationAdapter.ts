const WWebJsRuntimeMessage: any =
  require("whatsapp-web.js/src/structures/Message");
import ClassifyWhatsAppReconciliationMessageService, {
  FindKnownWhatsAppReconciliationMessageIdsService
} from "../../../services/WhatsappService/ClassifyWhatsAppReconciliationMessageService";

import ResolveWhatsAppReconciliationBoundaryService from "../../../services/WhatsappService/ResolveWhatsAppReconciliationBoundaryService";

import {
  getWhatsappReconciliationCheckpoint,
  saveWhatsappReconciliationCheckpoint
} from "../../../services/WhatsappService/WhatsappReconciliationCheckpointService";

import type {
  WhatsAppReconciliationCancellationSignal
} from "../../../services/WhatsappService/WhatsAppReconciliationRuntime";

import type {
  WhatsAppReconciliationContactWorkItem,
  WhatsAppReconciliationMessageWorkItem
} from "../../../services/WhatsappService/RunWhatsAppReconciliationService";

import CollectWWebJsRawReconciliationHistory, {
  WWebJsRawReconciliationChat,
  WWebJsRawReconciliationMessage
} from "./wwebjsReconciliationRawCollector";

import ComposeWWebJsDeferredReconciliationMessages from "./wwebjsReconciliationDeferredComposer";

import {
  mapWWebJsContactToReconciliationMetadata,
  WWebJsReconciliationContactLike
} from "./wwebjsReconciliationContactMetadata";

import createWWebJsReconciliationOrchestrator, {
  WWebJsReconciliationOrchestrator
} from "./wwebjsReconciliationOrchestrator";

export interface WWebJsReconciliationAdapterChat<
  TMessage extends WWebJsRawReconciliationMessage
> extends WWebJsRawReconciliationChat<TMessage> {
  id?: {
    _serialized?: string;
  };
}

export interface WWebJsReconciliationAdapterSession<
  TMessage extends WWebJsRawReconciliationMessage,
  TContact extends WWebJsReconciliationContactLike
> {
  getChats(): Promise<
    WWebJsReconciliationAdapterChat<TMessage>[]
  >;

  getContacts(): Promise<TContact[]>;
}

type MessageMetadata =
  WhatsAppReconciliationMessageWorkItem["metadata"];

interface AdapterServices {
  getCheckpoint: (
    whatsappId: number
  ) => Promise<Date | null>;

  saveCheckpoint: (
    whatsappId: number,
    checkpointAt: Date
  ) => Promise<unknown>;

  classifyMessage: (
    messageId: string
  ) => Promise<"existing" | "new">;

  classifyMessages: (
    messageIds: string[]
  ) => Promise<Set<string>>;

  resolveBoundary: typeof ResolveWhatsAppReconciliationBoundaryService;
}

interface Request<
  TMessage extends WWebJsRawReconciliationMessage,
  TContact extends WWebJsReconciliationContactLike
> {
  whatsappId: number;

  session:
    WWebJsReconciliationAdapterSession<
      TMessage,
      TContact
    >;

  resolveMessageId: (
    message: TMessage
  ) => string;

  shouldHandleMessage: (
    message: TMessage
  ) => boolean;

  resolveMessageMetadata: (
    message: TMessage
  ) => Promise<MessageMetadata>;

  processNewMessage: (
    message: TMessage
  ) => Promise<void>;

  captureBoundaryAt?: () => Date;

  services?: Partial<AdapterServices>;
}

const defaultServices: AdapterServices = {
  getCheckpoint: whatsappId =>
    getWhatsappReconciliationCheckpoint({
      whatsappId
    }),

  saveCheckpoint: (
    whatsappId,
    checkpointAt
  ) =>
    saveWhatsappReconciliationCheckpoint({
      whatsappId,
      checkpointAt
    }),

  classifyMessage:
    ClassifyWhatsAppReconciliationMessageService,

  classifyMessages:
    FindKnownWhatsAppReconciliationMessageIdsService,

  resolveBoundary:
    ResolveWhatsAppReconciliationBoundaryService
};

const normalizeIdentity = (
  value?: string | null
): string =>
  typeof value === "string"
    ? value.trim()
    : "";

export const resolveWWebJsReconciliationChatId = <
  TMessage extends WWebJsRawReconciliationMessage
>(
  chat: WWebJsReconciliationAdapterChat<TMessage>
): string | null => {
  const serialized =
    normalizeIdentity(
      chat?.id?._serialized
    );

  return serialized || null;
};

export const isEligibleWWebJsReconciliationChat = <
  TMessage extends WWebJsRawReconciliationMessage
>(
  chat: WWebJsReconciliationAdapterChat<TMessage>,
  chatId: string
): boolean => {
  const normalized =
    normalizeIdentity(chatId);

  if (!normalized) {
    return false;
  }

  /*
   * Existing production evidence proves status@broadcast must
   * not be processed. No archive/mute/readOnly policy is invented.
   */
  if (normalized === "status@broadcast") {
    return false;
  }

  /*
   * Raw collector requires a stable upper anchor. A chat without
   * lastMessage has no message work to reconcile; contacts are
   * enumerated independently later in the same run.
   */
  return Boolean(chat.lastMessage);
};

export const getWWebJsReconciliationContactIdentityKey = (
  contact: WhatsAppReconciliationContactWorkItem
): string | null => {
  const number =
    normalizeIdentity(
      contact.metadata.number
    );

  const lid =
    normalizeIdentity(
      contact.metadata.lid
    );

  if (!number && !lid) {
    return null;
  }

  return [
    number ? `number:${number}` : "",
    lid ? `lid:${lid}` : ""
  ].join("|");
};

const createWWebJsReconciliationAdapter = <
  TMessage extends WWebJsRawReconciliationMessage,
  TContact extends WWebJsReconciliationContactLike
>({
  whatsappId,
  session,
  resolveMessageId,
  shouldHandleMessage,
  resolveMessageMetadata,
  processNewMessage,
  captureBoundaryAt = () => new Date(),
  services: serviceOverrides = {}
}: Request<
  TMessage,
  TContact
>): WWebJsReconciliationOrchestrator => {
  const services: AdapterServices = {
    ...defaultServices,
    ...serviceOverrides
  };
  if (
    serviceOverrides.classifyMessage &&
    !serviceOverrides.classifyMessages
  ) {
    services.classifyMessages =
      async messageIds => {
        const knownIds = new Set<string>();

        for (const messageId of messageIds) {
          const classification =
            await serviceOverrides.classifyMessage!(
              messageId
            );

          if (classification === "existing") {
            knownIds.add(messageId);
          }
        }

        return knownIds;
      };
  }

  return createWWebJsReconciliationOrchestrator<
    WWebJsReconciliationAdapterChat<TMessage>,
    TContact
  >({
    whatsappId,

    dependencies: {
      captureBoundaryAt,

      loadCheckpointAt:
        async (
          requestedWhatsappId,
          signal
        ) => {
          signal.throwIfAborted();

          const checkpoint =
            await services.getCheckpoint(
              requestedWhatsappId
            );

          signal.throwIfAborted();

          return checkpoint;
        },

      resolveBoundary:
        async (
          request,
          signal
        ) => {
          signal.throwIfAborted();

          const boundary =
            services.resolveBoundary(
              request
            );

          signal.throwIfAborted();

          return boundary;
        },

      listChats:
        async signal => {
          signal.throwIfAborted();

          const runtimeSession =
            session as any;

          const pupPage =
            runtimeSession?.pupPage;

          /*
           * Unit-test / non-browser fallback only.
           *
           * Production WWebJS sessions expose pupPage and must
           * never use session.getChats() for P05 because
           * getChats -> WWebJS.getChats -> getChatModel can fail
           * on valid non-group LID chats.
           */
          if (!pupPage) {
            const chats =
              await session.getChats();

            signal.throwIfAborted();

            return chats;
          }

          /*
           * Read only the minimal chat envelope directly from
           * WAWebCollections. Do NOT call getChatModel().
           *
           * lastMessage only acts as the immutable upper anchor.
           * Real Message instances are constructed below when
           * bounded history is actually fetched.
           */
          const chatEnvelopes =
            await pupPage.evaluate(
              () => {
                const collections =
                  (window as any).require(
                    "WAWebCollections"
                  );

                const rawChats =
                  collections.Chat
                    .getModelsArray();

                return rawChats
                  .map((chat: any) => {
                    const chatId =
                      chat?.id?._serialized ||
                      "";

                    const lastMessage =
                      chat?.lastMessage ||
                      null;

                    if (!chatId) {
                      return null;
                    }

                    if (!lastMessage) {
                      return {
                        chatId,
                        lastMessage: null
                      };
                    }

                    const rawId =
                      lastMessage?.id;

                    const messageId =
                      typeof rawId?.id ===
                        "string"
                        ? rawId.id
                        : "";

                    const serializedId =
                      typeof rawId?._serialized ===
                        "string"
                        ? rawId._serialized
                        : "";

                    const timestamp =
                      Number(
                        lastMessage?.t ??
                        lastMessage?.timestamp
                      );

                    return {
                      chatId,
                      lastMessage: {
                        id: {
                          id: messageId,
                          _serialized:
                            serializedId
                        },
                        timestamp
                      }
                    };
                  })
                  .filter(Boolean);
              }
            );

          signal.throwIfAborted();

          return chatEnvelopes.map(
            (envelope: any) => ({
              id: {
                _serialized:
                  envelope.chatId
              },

              lastMessage:
                envelope.lastMessage,

              /*
               * This intentionally mirrors Chat.fetchMessages()
               * from the installed whatsapp-web.js 1.34.7, but
               * starts from getChat(..., getAsModel:false).
               *
               * Therefore no ChatFactory/getChatModel and no
               * groupMetadata lookup are involved.
               */
              fetchMessages:
                async ({
                  limit
                }: {
                  limit: number;
                }) => {
                  signal.throwIfAborted();

                  const messageModels =
                    await pupPage.evaluate(
                      async (
                        chatId: string,
                        requestedLimit: number
                      ) => {
                        const msgFilter =
                          (message: any) =>
                            !message
                              .isNotification;

                        const chat =
                          await (
                            window as any
                          ).WWebJS.getChat(
                            chatId,
                            {
                              getAsModel:
                                false
                            }
                          );

                        if (!chat) {
                          return [];
                        }

                        let messages =
                          chat.msgs
                            .getModelsArray()
                            .filter(
                              msgFilter
                            );

                        if (
                          requestedLimit >
                          0
                        ) {
                          while (
                            messages.length <
                            requestedLimit
                          ) {
                            const loaded =
                              await (
                                window as any
                              )
                                .require(
                                  "WAWebChatLoadMessages"
                                )
                                .loadEarlierMsgs(
                                  {
                                    chat
                                  }
                                );

                            if (
                              !loaded ||
                              !loaded.length
                            ) {
                              break;
                            }

                            messages = [
                              ...loaded.filter(
                                msgFilter
                              ),
                              ...messages
                            ];
                          }

                          if (
                            messages.length >
                            requestedLimit
                          ) {
                            messages.sort(
                              (
                                first:
                                  any,
                                second:
                                  any
                              ) =>
                                first.t >
                                second.t
                                  ? 1
                                  : -1
                            );

                            messages =
                              messages.splice(
                                messages.length -
                                  requestedLimit
                              );
                          }
                        }

                        return messages.map(
                          (message: any) =>
                            (
                              window as any
                            ).WWebJS
                              .getMessageModel(
                                message
                              )
                        );
                      },
                      envelope.chatId,
                      limit
                    );

                  signal.throwIfAborted();

                  return messageModels.map(
                    (model: any) =>
                      new WWebJsRuntimeMessage(
                        runtimeSession,
                        model
                      )
                  ) as TMessage[];
                }
            })
          );
        },

      getChatId:
        resolveWWebJsReconciliationChatId,

      isEligibleChat:
        isEligibleWWebJsReconciliationChat,

      collectChatWork:
        async ({
          chat,
          lowerBoundAt,
          signal
        }) => {
          signal.throwIfAborted();

          /*
           * Manual P05 reconciliation is hard-bounded by time.
           *
           * If the provider already tells us that the newest
           * message in this chat is older than lowerBoundAt,
           * there is nothing eligible to reconcile and calling
           * fetchMessages would be pure historical I/O.
           *
           * Invalid/unknown timestamps deliberately fall through
           * to the scanner so existing fail-closed validation is
           * preserved.
           */
          const lastMessageTimestamp =
            Number(chat.lastMessage?.timestamp);

          const lowerBoundUnixSeconds =
            Math.floor(
              lowerBoundAt.getTime() / 1000
            );

          if (
            Number.isFinite(lastMessageTimestamp) &&
            Number.isInteger(lastMessageTimestamp) &&
            lastMessageTimestamp > 0 &&
            lastMessageTimestamp <
              lowerBoundUnixSeconds
          ) {
            return [];
          }

          const collection =
            await CollectWWebJsRawReconciliationHistory({
              chat,
              lowerBoundAt,
              signal,

              resolveMessageId,

              findKnownMessageIds:
                async messageIds => {
                  signal.throwIfAborted();

                  const knownMessageIds =
                    await services.classifyMessages(
                      messageIds
                    );

                  signal.throwIfAborted();

                  return knownMessageIds;
                },
              isKnownMessage:
                async messageId => {
                  signal.throwIfAborted();

                  const classification =
                    await services.classifyMessage(
                      messageId
                    );

                  signal.throwIfAborted();

                  return (
                    classification ===
                    "existing"
                  );
                }
            });

          signal.throwIfAborted();

          const eligibleMessages =
            collection.scan.messages.filter(
              message =>
                shouldHandleMessage(
                  message
                )
            );

          signal.throwIfAborted();

          const workItems =
            await ComposeWWebJsDeferredReconciliationMessages({
              messages:
                eligibleMessages,

              resolveMessageId,

              resolveMetadata:
                async message => {
                  signal.throwIfAborted();

                  const metadata =
                    await resolveMessageMetadata(
                      message
                    );

                  signal.throwIfAborted();

                  return metadata;
                },

              /*
               * This closure remains lazy. It is executed later
               * by Reconcile -> T1 under the Message claim.
               */
              processNewMessage:
                async message => {
                  await processNewMessage(
                    message
                  );
                }
            });

          signal.throwIfAborted();

          return workItems;
        },

      listContacts:
        async signal => {
          signal.throwIfAborted();

          /*
           * P05 manual reconciliation is scoped to messages from
           * the bounded history window, not to a full WhatsApp
           * address-book import.
           *
           * Message metadata is reconciled downstream for every
           * discovered conversation/message, so a global
           * session.getContacts() here is unnecessary and was
           * keeping the manual run blocked before any message
           * could be processed.
           */
          return [];
        },
        mapContact:
          async (
            contact,
            signal
          ) => {
            signal.throwIfAborted();

            try {
              const metadata =
                await mapWWebJsContactToReconciliationMetadata(
                  contact
                );

              signal.throwIfAborted();

              return {
                metadata
              };
            } catch (err) {
              signal.throwIfAborted();

              if (
                err instanceof Error &&
                err.message ===
                  "Invalid contact number from WhatsApp payload"
              ) {
                return null;
              }

              throw err;
            }
          },

        getContactIdentityKey:
          getWWebJsReconciliationContactIdentityKey,

      saveCheckpoint:
        async ({
          whatsappId:
            requestedWhatsappId,
          checkpointCandidateAt,
          signal
        }) => {
          signal.throwIfAborted();

          await services.saveCheckpoint(
            requestedWhatsappId,
            checkpointCandidateAt
          );

          signal.throwIfAborted();
        }
    }
  });
};

export default createWWebJsReconciliationAdapter;
