interface DeleteLookupMessage {
  id?: {
    id?: string;
    _serialized?: string;
  };
  fromMe?: boolean;
  delete(revoke?: boolean): Promise<void>;
}

interface DeleteLookupChat {
  fetchMessages(options: { limit: number }): Promise<DeleteLookupMessage[]>;
}

export interface DeleteLookupClient {
  getMessageById(messageId: string): Promise<DeleteLookupMessage | null>;
  getChatById(chatId: string): Promise<DeleteLookupChat>;
}

interface DeleteLookupLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

const DELETE_LOOKUP_FALLBACK_LIMIT = 50;

const isMatchingDeleteLookupMessage = (
  candidate: DeleteLookupMessage,
  serializedMsgId: string,
  messageId: string,
  fromMe: boolean
): boolean => {
  const candidateId = candidate.id?.id;
  const candidateSerializedId = candidate.id?._serialized;
  const candidateFromMe =
    candidate.fromMe === undefined ? true : candidate.fromMe === fromMe;

  return (
    candidateFromMe &&
    (candidateId === messageId || candidateSerializedId === serializedMsgId)
  );
};

export const revokeMessageWithLookupFallback = async (
  wbot: DeleteLookupClient,
  chatId: string,
  messageId: string,
  fromMe: boolean,
  buildSerializedMessageId: (
    chatId: string,
    fromMe: boolean,
    messageId: string
  ) => string,
  logger: DeleteLookupLogger,
  fetchLimit = DELETE_LOOKUP_FALLBACK_LIMIT
): Promise<void> => {
  const serializedMsgId = buildSerializedMessageId(chatId, fromMe, messageId);
  let directMessage: DeleteLookupMessage | null = null;

  try {
    directMessage = await wbot.getMessageById(serializedMsgId);
  } catch (err) {
    logger.warn(
      {
        err,
        chatId,
        messageId,
        serializedMsgId,
        fetchLimit
      },
      "wwebjs direct delete lookup failed; retrying via chat messages"
    );
  }

  if (directMessage) {
    await directMessage.delete(true);
    return;
  }

  const chat = await wbot.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit: fetchLimit });
  const fallbackMessage = messages.find(candidate =>
    isMatchingDeleteLookupMessage(candidate, serializedMsgId, messageId, fromMe)
  );

  if (!fallbackMessage) {
    throw new Error(
      `WWebJS delete lookup could not find message ${serializedMsgId} in chat ${chatId}`
    );
  }

  await fallbackMessage.delete(true);
};