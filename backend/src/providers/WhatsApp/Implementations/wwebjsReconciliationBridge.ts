import {
  ContactPayload,
  MediaPayload,
  MessagePayload,
  WhatsappContextPayload,
  handleMessage
} from "../../../handlers/handleWhatsappEvents";

import RunWhatsAppReconciliationService, {
  WhatsAppReconciliationMessageWorkItem,
  WhatsAppReconciliationWork
} from "../../../services/WhatsappService/RunWhatsAppReconciliationService";

import {
  WhatsAppReconciliationCancellationSignal,
  WhatsAppReconciliationTrigger
} from "../../../services/WhatsappService/WhatsAppReconciliationRuntime";

export interface WWebJsReconciliationPreparedMessage {
  messagePayload: MessagePayload;
  contactPayload: ContactPayload;
  contextPayload: WhatsappContextPayload;
  mediaPayload?: MediaPayload;
}

interface Request {
  whatsappId: number;
  trigger: WhatsAppReconciliationTrigger;
  preparedMessages?: WWebJsReconciliationPreparedMessage[];
  deferredMessages?: WhatsAppReconciliationMessageWorkItem[];
  collectWork?: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<WhatsAppReconciliationWork>;

  finalizeWork?: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<void>;
}

const buildMessageWorkItem = (
  item: WWebJsReconciliationPreparedMessage
): WhatsAppReconciliationMessageWorkItem => ({
  messageId: item.messagePayload.id,

  metadata: {
    name: item.contactPayload.name,
    number: item.contactPayload.number,
    lid: item.contactPayload.lid,
    profilePicUrl: item.contactPayload.profilePicUrl,
    isGroup: item.contactPayload.isGroup
  },

  processNewMessage: async () => {
    await handleMessage(
      item.messagePayload,
      item.contactPayload,
      item.contextPayload,
      item.mediaPayload
    );
  }
});

const RunWWebJsReconciliationBridge = async ({
  whatsappId,
  trigger,
  preparedMessages = [],
  deferredMessages = [],
  collectWork,
  finalizeWork
}: Request) => {
  const messages: WhatsAppReconciliationMessageWorkItem[] = [
    ...preparedMessages.map(buildMessageWorkItem),
    ...deferredMessages
  ];

  return RunWhatsAppReconciliationService({
    whatsappId,
    trigger,
    messages,
    collectWork,
    finalizeWork
  });
};

export default RunWWebJsReconciliationBridge;
