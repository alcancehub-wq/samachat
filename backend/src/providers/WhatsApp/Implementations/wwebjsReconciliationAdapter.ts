import ClassifyWhatsAppReconciliationMessageService from "../../../services/WhatsappService/ClassifyWhatsAppReconciliationMessageService";

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

          try {
            const chats =
              await session.getChats();

            signal.throwIfAborted();

            return chats;
          } catch (err) {
            signal.throwIfAborted();

            try {
              const runtimeSession =
                session as any;

              const pupPage =
                runtimeSession?.pupPage;

              if (pupPage) {
                const probe =
                  await pupPage.evaluate(
                    async () => {
                      const result: any = {
                        timestamp:
                          new Date().toISOString(),
                        collectionOk: false,
                        collectionCount: null,
                        successfulModelsBeforeFailure: 0,
                        firstFailure: null,
                        collectionError: null
                      };

                      try {
                        const collections =
                          (window as any).require(
                            "WAWebCollections"
                          );

                        const rawChats =
                          collections.Chat.getModelsArray();

                        result.collectionOk = true;
                        result.collectionCount =
                          rawChats.length;

                        for (
                          let index = 0;
                          index < rawChats.length;
                          index += 1
                        ) {
                          const chat =
                            rawChats[index];

                          const chatId =
                            chat?.id?._serialized ||
                            chat?.id?.user ||
                            `index:${index}`;

                          try {
                            await (
                              window as any
                            ).WWebJS.getChatModel(
                              chat
                            );

                            result.successfulModelsBeforeFailure += 1;
                          } catch (modelErr) {
                            result.firstFailure = {
                              index,
                              chatId,
                              hasGroupMetadata:
                                Boolean(
                                  chat?.groupMetadata
                                ),
                              formattedTitle:
                                typeof chat?.formattedTitle ===
                                "string"
                                  ? chat.formattedTitle
                                  : null,
                              errorName:
                                modelErr instanceof Error
                                  ? modelErr.name
                                  : typeof modelErr,
                              errorMessage:
                                modelErr instanceof Error
                                  ? modelErr.message
                                  : String(modelErr),
                              errorStack:
                                modelErr instanceof Error
                                  ? modelErr.stack
                                  : null
                            };

                            break;
                          }
                        }
                      } catch (collectionErr) {
                        result.collectionError = {
                          errorName:
                            collectionErr instanceof Error
                              ? collectionErr.name
                              : typeof collectionErr,
                          errorMessage:
                            collectionErr instanceof Error
                              ? collectionErr.message
                              : String(collectionErr),
                          errorStack:
                            collectionErr instanceof Error
                              ? collectionErr.stack
                              : null
                        };
                      }

                      return result;
                    }
                  );

                require("fs").appendFileSync(
                  "/tmp/samachat-p05-getchats-probe.log",
                  `${JSON.stringify({
                    whatsappId,
                    originalErrorName:
                      err instanceof Error
                        ? err.name
                        : typeof err,
                    originalErrorMessage:
                      err instanceof Error
                        ? err.message
                        : String(err),
                    probe
                  })}\n`,
                  "utf8"
                );
              }
            } catch (probeErr) {
              require("fs").appendFileSync(
                "/tmp/samachat-p05-getchats-probe.log",
                `${JSON.stringify({
                  whatsappId,
                  probeInfrastructureFailure: true,
                  errorName:
                    probeErr instanceof Error
                      ? probeErr.name
                      : typeof probeErr,
                  errorMessage:
                    probeErr instanceof Error
                      ? probeErr.message
                      : String(probeErr),
                  errorStack:
                    probeErr instanceof Error
                      ? probeErr.stack
                      : null
                })}\n`,
                "utf8"
              );
            }

            throw err;
          }
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

          const collection =
            await CollectWWebJsRawReconciliationHistory({
              chat,
              lowerBoundAt,
              signal,

              resolveMessageId,

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

          const contacts =
            await session.getContacts();

          signal.throwIfAborted();

          return contacts;
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