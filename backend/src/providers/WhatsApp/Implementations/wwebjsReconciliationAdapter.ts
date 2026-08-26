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
                const collectionProbe =
                  await pupPage.evaluate(
                    () => {
                      try {
                        const collections =
                          (window as any).require(
                            "WAWebCollections"
                          );

                        const rawChats =
                          collections.Chat.getModelsArray();

                        return {
                          collectionOk: true,
                          collectionCount:
                            rawChats.length,
                          collectionError: null,
                          chats:
                            rawChats.map(
                              (
                                chat: any,
                                index: number
                              ) => ({
                                index,
                                chatId:
                                  chat?.id?._serialized ||
                                  chat?.id?.user ||
                                  `index:${index}`,
                                hasGroupMetadata:
                                  Boolean(
                                    chat?.groupMetadata
                                  ),
                                formattedTitle:
                                  typeof chat?.formattedTitle ===
                                  "string"
                                    ? chat.formattedTitle
                                    : null
                              })
                            )
                        };
                      } catch (collectionErr) {
                        return {
                          collectionOk: false,
                          collectionCount: null,
                          collectionError: {
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
                          },
                          chats: []
                        };
                      }
                    }
                  );

                const probe: any = {
                  timestamp:
                    new Date().toISOString(),
                  collectionOk:
                    collectionProbe.collectionOk,
                  collectionCount:
                    collectionProbe.collectionCount,
                  successfulModelsBeforeFailure: 0,
                  firstFailure: null,
                  collectionError:
                    collectionProbe.collectionError
                };

                if (
                  collectionProbe.collectionOk &&
                  Array.isArray(
                    collectionProbe.chats
                  )
                ) {
                  for (
                    const chatMeta of
                    collectionProbe.chats
                  ) {
                    try {
                      await pupPage.evaluate(
                        (index: number) => {
                          const collections =
                            (window as any).require(
                              "WAWebCollections"
                            );

                          const rawChats =
                            collections.Chat.getModelsArray();

                          const chat =
                            rawChats[index];

                          return (
                            window as any
                          ).WWebJS.getChatModel(
                            chat
                          );
                        },
                        chatMeta.index
                      );

                      probe.successfulModelsBeforeFailure += 1;
                    } catch (modelErr) {
                      probe.firstFailure = {
                        ...chatMeta,
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

                      const groupStepProbe: any = {
                        serialize: null,
                        createWid: null,
                        metadataCollection: null,
                        metadataUpdate: null,
                        lidMigrationUtils: null,
                        metadataSerialize: null,
                        participantToPn: null
                      };

                      try {
                        groupStepProbe.serialize =
                          await pupPage.evaluate(
                            (index: number) => {
                              try {
                                const chats =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    )
                                    .Chat.getModelsArray();

                                const chat =
                                  chats[index];

                                const serialized =
                                  chat.serialize();

                                return {
                                  ok: true,
                                  serializedId:
                                    serialized?.id?._serialized ||
                                    serialized?.id ||
                                    null
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            },
                            chatMeta.index
                          );

                        groupStepProbe.createWid =
                          await pupPage.evaluate(
                            (index: number) => {
                              try {
                                const chats =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    )
                                    .Chat.getModelsArray();

                                const chat =
                                  chats[index];

                                const wid =
                                  (window as any)
                                    .require(
                                      "WAWebWidFactory"
                                    )
                                    .createWid(
                                      chat.id._serialized
                                    );

                                return {
                                  ok: true,
                                  wid:
                                    wid?._serialized ||
                                    String(wid)
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            },
                            chatMeta.index
                          );

                        groupStepProbe.metadataCollection =
                          await pupPage.evaluate(
                            () => {
                              try {
                                const collections =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    );

                                const metadata =
                                  collections.GroupMetadata ||
                                  collections.WAWebGroupMetadataCollection;

                                return {
                                  ok: true,
                                  present:
                                    Boolean(metadata),
                                  updateType:
                                    typeof metadata?.update
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            }
                          );

                        groupStepProbe.metadataUpdate =
                          await pupPage.evaluate(
                            (index: number) => {
                              try {
                                const collections =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    );

                                const chats =
                                  collections.Chat
                                    .getModelsArray();

                                const chat =
                                  chats[index];

                                const wid =
                                  (window as any)
                                    .require(
                                      "WAWebWidFactory"
                                    )
                                    .createWid(
                                      chat.id._serialized
                                    );

                                const metadata =
                                  collections.GroupMetadata ||
                                  collections.WAWebGroupMetadataCollection;

                                return metadata
                                  .update(wid)
                                  .then(
                                    () => ({
                                      ok: true
                                    }),
                                    (stepErr: any) => ({
                                      ok: false,
                                      errorName:
                                        stepErr instanceof Error
                                          ? stepErr.name
                                          : typeof stepErr,
                                      errorMessage:
                                        stepErr instanceof Error
                                          ? stepErr.message
                                          : String(stepErr),
                                      errorStack:
                                        stepErr instanceof Error
                                          ? stepErr.stack
                                          : null
                                    })
                                  );
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            },
                            chatMeta.index
                          );

                        groupStepProbe.lidMigrationUtils =
                          await pupPage.evaluate(
                            () => {
                              try {
                                const utils =
                                  (window as any)
                                    .require(
                                      "WAWebLidMigrationUtils"
                                    );

                                return {
                                  ok: true,
                                  toPnType:
                                    typeof utils?.toPn
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            }
                          );

                        groupStepProbe.metadataSerialize =
                          await pupPage.evaluate(
                            (index: number) => {
                              try {
                                const chats =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    )
                                    .Chat.getModelsArray();

                                const chat =
                                  chats[index];

                                const serialized =
                                  chat.groupMetadata
                                    .serialize();

                                return {
                                  ok: true,
                                  participantCount:
                                    Array.isArray(
                                      serialized?.participants
                                    )
                                      ? serialized
                                          .participants
                                          .length
                                      : 0
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            },
                            chatMeta.index
                          );

                        groupStepProbe.participantToPn =
                          await pupPage.evaluate(
                            (index: number) => {
                              try {
                                const chats =
                                  (window as any)
                                    .require(
                                      "WAWebCollections"
                                    )
                                    .Chat.getModelsArray();

                                const chat =
                                  chats[index];

                                const serialized =
                                  chat.groupMetadata
                                    .serialize();

                                const participants =
                                  serialized
                                    ?.participants ||
                                  [];

                                const { toPn } =
                                  (window as any)
                                    .require(
                                      "WAWebLidMigrationUtils"
                                    );

                                for (
                                  let participantIndex = 0;
                                  participantIndex <
                                  participants.length;
                                  participantIndex += 1
                                ) {
                                  try {
                                    toPn(
                                      participants[
                                        participantIndex
                                      ].id
                                    );
                                  } catch (stepErr) {
                                    return {
                                      ok: false,
                                      participantIndex,
                                      participantId:
                                        participants[
                                          participantIndex
                                        ]?.id
                                          ?._serialized ||
                                        String(
                                          participants[
                                            participantIndex
                                          ]?.id
                                        ),
                                      errorName:
                                        stepErr instanceof Error
                                          ? stepErr.name
                                          : typeof stepErr,
                                      errorMessage:
                                        stepErr instanceof Error
                                          ? stepErr.message
                                          : String(stepErr),
                                      errorStack:
                                        stepErr instanceof Error
                                          ? stepErr.stack
                                          : null
                                    };
                                  }
                                }

                                return {
                                  ok: true,
                                  participantCount:
                                    participants.length
                                };
                              } catch (stepErr) {
                                return {
                                  ok: false,
                                  errorName:
                                    stepErr instanceof Error
                                      ? stepErr.name
                                      : typeof stepErr,
                                  errorMessage:
                                    stepErr instanceof Error
                                      ? stepErr.message
                                      : String(stepErr),
                                  errorStack:
                                    stepErr instanceof Error
                                      ? stepErr.stack
                                      : null
                                };
                              }
                            },
                            chatMeta.index
                          );

                        probe.firstFailure.groupStepProbe =
                          groupStepProbe;
                      } catch (groupProbeErr) {
                        probe.firstFailure.groupStepProbe = {
                          infrastructureFailure: true,
                          errorName:
                            groupProbeErr instanceof Error
                              ? groupProbeErr.name
                              : typeof groupProbeErr,
                          errorMessage:
                            groupProbeErr instanceof Error
                              ? groupProbeErr.message
                              : String(groupProbeErr),
                          errorStack:
                            groupProbeErr instanceof Error
                              ? groupProbeErr.stack
                              : null
                        };
                      }

                      if (!chatMeta.hasGroupMetadata) {
                        const nonGroupStepProbe: any = {
                          rawState: null,
                          cachedLastMessage: null,
                          fetchedLastMessage: null,
                          messageModel: null
                        };

                        try {
                          nonGroupStepProbe.rawState =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const serialized =
                                    chat.serialize();

                                  return {
                                    ok: true,
                                    chatId:
                                      chat?.id?._serialized ||
                                      null,
                                    formattedTitle:
                                      chat?.formattedTitle ||
                                      null,
                                    hasGroupMetadata:
                                      Boolean(
                                        chat?.groupMetadata
                                      ),
                                    hasNewsletterMetadata:
                                      Boolean(
                                        chat?.newsletterMetadata
                                      ),
                                    serializedMsgsLength:
                                      Array.isArray(
                                        serialized?.msgs
                                      )
                                        ? serialized.msgs.length
                                        : 0,
                                    hasLastReceivedKey:
                                      Boolean(
                                        chat?.lastReceivedKey
                                      ),
                                    lastReceivedKey:
                                      chat?.lastReceivedKey
                                        ?._serialized ||
                                      null
                                  };
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          nonGroupStepProbe.exactLastMessagePath =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const serialized =
                                    chat.serialize();

                                  const rawKey =
                                    chat.lastReceivedKey;

                                  const keyShape = {
                                    exists:
                                      Boolean(rawKey),
                                    type:
                                      typeof rawKey,
                                    constructorName:
                                      rawKey?.constructor
                                        ?.name ||
                                      null,
                                    keys:
                                      rawKey
                                        ? Object.keys(rawKey)
                                        : [],
                                    serialized:
                                      rawKey?._serialized ??
                                      null,
                                    idSerialized:
                                      rawKey?.id
                                        ?._serialized ??
                                      null,
                                    id:
                                      rawKey?.id ??
                                      null,
                                    fromSerialized:
                                      rawKey?.from
                                        ?._serialized ??
                                      null,
                                    remoteSerialized:
                                      rawKey?.remote
                                        ?._serialized ??
                                      null,
                                    stringValue:
                                      rawKey
                                        ? String(rawKey)
                                        : null
                                  };

                                  if (
                                    !serialized?.msgs ||
                                    serialized.msgs.length === 0
                                  ) {
                                    return {
                                      ok: true,
                                      stage:
                                        "NO_SERIALIZED_MSGS",
                                      keyShape
                                    };
                                  }

                                  if (!rawKey) {
                                    return {
                                      ok: true,
                                      stage:
                                        "NO_LAST_RECEIVED_KEY",
                                      keyShape
                                    };
                                  }

                                  const exactKey =
                                    rawKey._serialized;

                                  let cached;

                                  try {
                                    cached =
                                      collections.Msg.get(
                                        exactKey
                                      );
                                  } catch (stepErr) {
                                    return {
                                      ok: false,
                                      stage: "MSG_GET",
                                      exactKey:
                                        exactKey ??
                                        null,
                                      keyShape,
                                      errorName:
                                        stepErr instanceof Error
                                          ? stepErr.name
                                          : typeof stepErr,
                                      errorMessage:
                                        stepErr instanceof Error
                                          ? stepErr.message
                                          : String(stepErr),
                                      errorStack:
                                        stepErr instanceof Error
                                          ? stepErr.stack
                                          : null
                                    };
                                  }

                                  if (cached) {
                                    try {
                                      const model =
                                        (window as any)
                                          .WWebJS
                                          .getMessageModel(
                                            cached
                                          );

                                      return {
                                        ok: true,
                                        stage:
                                          "CACHED_MESSAGE_MODEL",
                                        exactKey:
                                          exactKey ??
                                          null,
                                        keyShape,
                                        messageId:
                                          model?.id
                                            ?._serialized ||
                                          model?.id ||
                                          null
                                      };
                                    } catch (stepErr) {
                                      return {
                                        ok: false,
                                        stage:
                                          "CACHED_GET_MESSAGE_MODEL",
                                        exactKey:
                                          exactKey ??
                                          null,
                                        keyShape,
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      };
                                    }
                                  }

                                  return collections.Msg
                                    .getMessagesById([
                                      exactKey
                                    ])
                                    .then(
                                      (result: any) => {
                                        const message =
                                          result
                                            ?.messages?.[0];

                                        if (!message) {
                                          return {
                                            ok: true,
                                            stage:
                                              "NO_FETCHED_MESSAGE",
                                            exactKey:
                                              exactKey ??
                                              null,
                                            keyShape
                                          };
                                        }

                                        try {
                                          const model =
                                            (window as any)
                                              .WWebJS
                                              .getMessageModel(
                                                message
                                              );

                                          return {
                                            ok: true,
                                            stage:
                                              "FETCHED_MESSAGE_MODEL",
                                            exactKey:
                                              exactKey ??
                                              null,
                                            keyShape,
                                            messageId:
                                              model?.id
                                                ?._serialized ||
                                              model?.id ||
                                              null
                                          };
                                        } catch (stepErr) {
                                          return {
                                            ok: false,
                                            stage:
                                              "FETCHED_GET_MESSAGE_MODEL",
                                            exactKey:
                                              exactKey ??
                                              null,
                                            keyShape,
                                            errorName:
                                              stepErr instanceof Error
                                                ? stepErr.name
                                                : typeof stepErr,
                                            errorMessage:
                                              stepErr instanceof Error
                                                ? stepErr.message
                                                : String(stepErr),
                                            errorStack:
                                              stepErr instanceof Error
                                                ? stepErr.stack
                                                : null
                                          };
                                        }
                                      },
                                      (stepErr: any) => ({
                                        ok: false,
                                        stage:
                                          "GET_MESSAGES_BY_ID",
                                        exactKey:
                                          exactKey ??
                                          null,
                                        keyShape,
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      })
                                    );
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    stage:
                                      "OUTER_EXCEPTION",
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          nonGroupStepProbe.stringKeyFallback =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const rawKey =
                                    chat.lastReceivedKey;

                                  if (!rawKey) {
                                    return {
                                      ok: true,
                                      skipped: true,
                                      reason:
                                        "NO_LAST_RECEIVED_KEY"
                                    };
                                  }

                                  const stringKey =
                                    String(rawKey);

                                  let cached;

                                  try {
                                    cached =
                                      collections.Msg.get(
                                        stringKey
                                      );
                                  } catch (stepErr) {
                                    return {
                                      ok: false,
                                      stage:
                                        "STRING_KEY_MSG_GET",
                                      stringKey,
                                      errorName:
                                        stepErr instanceof Error
                                          ? stepErr.name
                                          : typeof stepErr,
                                      errorMessage:
                                        stepErr instanceof Error
                                          ? stepErr.message
                                          : String(stepErr),
                                      errorStack:
                                        stepErr instanceof Error
                                          ? stepErr.stack
                                          : null
                                    };
                                  }

                                  if (cached) {
                                    try {
                                      const model =
                                        (window as any)
                                          .WWebJS
                                          .getMessageModel(
                                            cached
                                          );

                                      return {
                                        ok: true,
                                        stage:
                                          "STRING_KEY_CACHE_HIT",
                                        stringKey,
                                        messageId:
                                          model?.id
                                            ?._serialized ||
                                          model?.id ||
                                          null
                                      };
                                    } catch (stepErr) {
                                      return {
                                        ok: false,
                                        stage:
                                          "STRING_KEY_CACHE_MODEL",
                                        stringKey,
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      };
                                    }
                                  }

                                  return collections.Msg
                                    .getMessagesById([
                                      stringKey
                                    ])
                                    .then(
                                      (result: any) => {
                                        const message =
                                          result
                                            ?.messages?.[0];

                                        if (!message) {
                                          return {
                                            ok: true,
                                            stage:
                                              "STRING_KEY_NO_MESSAGE",
                                            stringKey
                                          };
                                        }

                                        try {
                                          const model =
                                            (window as any)
                                              .WWebJS
                                              .getMessageModel(
                                                message
                                              );

                                          return {
                                            ok: true,
                                            stage:
                                              "STRING_KEY_FETCH_SUCCESS",
                                            stringKey,
                                            messageId:
                                              model?.id
                                                ?._serialized ||
                                              model?.id ||
                                              null
                                          };
                                        } catch (stepErr) {
                                          return {
                                            ok: false,
                                            stage:
                                              "STRING_KEY_FETCH_MODEL",
                                            stringKey,
                                            errorName:
                                              stepErr instanceof Error
                                                ? stepErr.name
                                                : typeof stepErr,
                                            errorMessage:
                                              stepErr instanceof Error
                                                ? stepErr.message
                                                : String(stepErr),
                                            errorStack:
                                              stepErr instanceof Error
                                                ? stepErr.stack
                                                : null
                                          };
                                        }
                                      },
                                      (stepErr: any) => ({
                                        ok: false,
                                        stage:
                                          "STRING_KEY_GET_MESSAGES_BY_ID",
                                        stringKey,
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      })
                                    );
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    stage:
                                      "STRING_KEY_OUTER_EXCEPTION",
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          nonGroupStepProbe.cachedLastMessage =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const serialized =
                                    chat.serialize();

                                  const msgsLength =
                                    Array.isArray(
                                      serialized?.msgs
                                    )
                                      ? serialized.msgs.length
                                      : 0;

                                  const key =
                                    chat?.lastReceivedKey
                                      ?._serialized ||
                                    null;

                                  if (
                                    msgsLength === 0 ||
                                    !key
                                  ) {
                                    return {
                                      ok: true,
                                      skipped: true,
                                      reason:
                                        msgsLength === 0
                                          ? "NO_SERIALIZED_MSGS"
                                          : "NO_LAST_RECEIVED_KEY"
                                    };
                                  }

                                  const cached =
                                    collections.Msg.get(key);

                                  return {
                                    ok: true,
                                    skipped: false,
                                    key,
                                    cacheHit:
                                      Boolean(cached),
                                    cachedMessageId:
                                      cached?.id?._serialized ||
                                      null
                                  };
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          nonGroupStepProbe.fetchedLastMessage =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const serialized =
                                    chat.serialize();

                                  const msgsLength =
                                    Array.isArray(
                                      serialized?.msgs
                                    )
                                      ? serialized.msgs.length
                                      : 0;

                                  const key =
                                    chat?.lastReceivedKey
                                      ?._serialized ||
                                    null;

                                  if (
                                    msgsLength === 0 ||
                                    !key
                                  ) {
                                    return Promise.resolve({
                                      ok: true,
                                      skipped: true,
                                      reason:
                                        msgsLength === 0
                                          ? "NO_SERIALIZED_MSGS"
                                          : "NO_LAST_RECEIVED_KEY"
                                    });
                                  }

                                  const cached =
                                    collections.Msg.get(key);

                                  if (cached) {
                                    return Promise.resolve({
                                      ok: true,
                                      skipped: true,
                                      reason:
                                        "CACHE_HIT",
                                      key
                                    });
                                  }

                                  return collections.Msg
                                    .getMessagesById([key])
                                    .then(
                                      (result: any) => ({
                                        ok: true,
                                        skipped: false,
                                        key,
                                        messageCount:
                                          Array.isArray(
                                            result?.messages
                                          )
                                            ? result.messages
                                                .length
                                            : 0,
                                        firstMessageId:
                                          result
                                            ?.messages?.[0]
                                            ?.id
                                            ?._serialized ||
                                          null
                                      }),
                                      (stepErr: any) => ({
                                        ok: false,
                                        key,
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      })
                                    );
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          nonGroupStepProbe.messageModel =
                            await pupPage.evaluate(
                              (index: number) => {
                                try {
                                  const collections =
                                    (window as any)
                                      .require(
                                        "WAWebCollections"
                                      );

                                  const chats =
                                    collections.Chat
                                      .getModelsArray();

                                  const chat =
                                    chats[index];

                                  const serialized =
                                    chat.serialize();

                                  const msgsLength =
                                    Array.isArray(
                                      serialized?.msgs
                                    )
                                      ? serialized.msgs.length
                                      : 0;

                                  const key =
                                    chat?.lastReceivedKey
                                      ?._serialized ||
                                    null;

                                  if (
                                    msgsLength === 0 ||
                                    !key
                                  ) {
                                    return Promise.resolve({
                                      ok: true,
                                      skipped: true,
                                      reason:
                                        msgsLength === 0
                                          ? "NO_SERIALIZED_MSGS"
                                          : "NO_LAST_RECEIVED_KEY"
                                    });
                                  }

                                  const cached =
                                    collections.Msg.get(key);

                                  if (cached) {
                                    try {
                                      const model =
                                        (window as any)
                                          .WWebJS
                                          .getMessageModel(
                                            cached
                                          );

                                      return Promise.resolve({
                                        ok: true,
                                        source: "CACHE",
                                        messageId:
                                          model?.id
                                            ?._serialized ||
                                          model?.id ||
                                          null
                                      });
                                    } catch (stepErr) {
                                      return Promise.resolve({
                                        ok: false,
                                        source: "CACHE",
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      });
                                    }
                                  }

                                  return collections.Msg
                                    .getMessagesById([key])
                                    .then(
                                      (result: any) => {
                                        try {
                                          const message =
                                            result
                                              ?.messages?.[0];

                                          if (!message) {
                                            return {
                                              ok: true,
                                              skipped: true,
                                              reason:
                                                "NO_FETCHED_MESSAGE"
                                            };
                                          }

                                          const model =
                                            (window as any)
                                              .WWebJS
                                              .getMessageModel(
                                                message
                                              );

                                          return {
                                            ok: true,
                                            source: "FETCH",
                                            messageId:
                                              model?.id
                                                ?._serialized ||
                                              model?.id ||
                                              null
                                          };
                                        } catch (stepErr) {
                                          return {
                                            ok: false,
                                            source: "FETCH",
                                            errorName:
                                              stepErr instanceof Error
                                                ? stepErr.name
                                                : typeof stepErr,
                                            errorMessage:
                                              stepErr instanceof Error
                                                ? stepErr.message
                                                : String(stepErr),
                                            errorStack:
                                              stepErr instanceof Error
                                                ? stepErr.stack
                                                : null
                                          };
                                        }
                                      },
                                      (stepErr: any) => ({
                                        ok: false,
                                        source:
                                          "FETCH_MESSAGES_BY_ID",
                                        errorName:
                                          stepErr instanceof Error
                                            ? stepErr.name
                                            : typeof stepErr,
                                        errorMessage:
                                          stepErr instanceof Error
                                            ? stepErr.message
                                            : String(stepErr),
                                        errorStack:
                                          stepErr instanceof Error
                                            ? stepErr.stack
                                            : null
                                      })
                                    );
                                } catch (stepErr) {
                                  return {
                                    ok: false,
                                    errorName:
                                      stepErr instanceof Error
                                        ? stepErr.name
                                        : typeof stepErr,
                                    errorMessage:
                                      stepErr instanceof Error
                                        ? stepErr.message
                                        : String(stepErr),
                                    errorStack:
                                      stepErr instanceof Error
                                        ? stepErr.stack
                                        : null
                                  };
                                }
                              },
                              chatMeta.index
                            );

                          probe.firstFailure.nonGroupStepProbe =
                            nonGroupStepProbe;
                        } catch (nonGroupProbeErr) {
                          probe.firstFailure.nonGroupStepProbe = {
                            infrastructureFailure: true,
                            errorName:
                              nonGroupProbeErr instanceof Error
                                ? nonGroupProbeErr.name
                                : typeof nonGroupProbeErr,
                            errorMessage:
                              nonGroupProbeErr instanceof Error
                                ? nonGroupProbeErr.message
                                : String(nonGroupProbeErr),
                            errorStack:
                              nonGroupProbeErr instanceof Error
                                ? nonGroupProbeErr.stack
                                : null
                          };
                        }
                      }

                      break;
                    }
                  }
                }
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

            const fallbackSession =
              session as any;

            const fallbackPage =
              fallbackSession?.pupPage;

            if (fallbackPage) {
              const repairedIndexes:
                number[] =
                await fallbackPage.evaluate(
                  () => {
                    const collections =
                      (window as any)
                        .require(
                          "WAWebCollections"
                        );

                    const chats =
                      collections.Chat
                        .getModelsArray();

                    const repaired:
                      number[] = [];

                    chats.forEach(
                      (
                        chat: any,
                        index: number
                      ) => {
                        const rawKey =
                          chat?.lastReceivedKey;

                        if (
                          !rawKey ||
                          rawKey._serialized
                        ) {
                          return;
                        }

                        const stringKey =
                          String(rawKey);

                        if (
                          !stringKey ||
                          stringKey ===
                            "[object Object]" ||
                          stringKey ===
                            "undefined" ||
                          stringKey ===
                            "null"
                        ) {
                          return;
                        }

                        try {
                          rawKey._serialized =
                            stringKey;

                          if (
                            rawKey._serialized ===
                            stringKey
                          ) {
                            repaired.push(index);
                          }
                        } catch {
                          // Unsupported provider key shape remains untouched.
                        }
                      }
                    );

                    return repaired;
                  }
                );

              if (
                Array.isArray(
                  repairedIndexes
                ) &&
                repairedIndexes.length > 0
              ) {
                try {
                  const recoveredChats =
                    await session.getChats();

                  signal.throwIfAborted();

                  return recoveredChats;
                } finally {
                  try {
                    await fallbackPage.evaluate(
                      (
                        indexes:
                          number[]
                      ) => {
                        const collections =
                          (window as any)
                            .require(
                              "WAWebCollections"
                            );

                        const chats =
                          collections.Chat
                            .getModelsArray();

                        indexes.forEach(
                          index => {
                            const rawKey =
                              chats[index]
                                ?.lastReceivedKey;

                            if (
                              rawKey &&
                              rawKey._serialized
                            ) {
                              try {
                                delete rawKey
                                  ._serialized;
                              } catch {
                                // Best-effort cleanup only.
                              }
                            }
                          }
                        );
                      },
                      repairedIndexes
                    );
                  } catch {
                    // Cleanup failure must not replace reconciliation result.
                  }
                }
              }
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
