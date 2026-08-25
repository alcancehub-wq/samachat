import Message from "../../models/Message";
import { Op } from "sequelize";

export type WhatsAppReconciliationMessageClassification =
  | "new"
  | "existing";

export const FindKnownWhatsAppReconciliationMessageIdsService = async (
  messageIds: string[]
): Promise<Set<string>> => {
  if (!Array.isArray(messageIds)) {
    throw new Error("ERR_INVALID_WHATSAPP_MESSAGE_IDS");
  }

  const normalizedMessageIds = Array.from(
    new Set(
      messageIds.map(messageId => {
        const normalized =
          typeof messageId === "string"
            ? messageId.trim()
            : "";

        if (!normalized) {
          throw new Error("ERR_INVALID_WHATSAPP_MESSAGE_ID");
        }

        return normalized;
      })
    )
  );

  if (normalizedMessageIds.length === 0) {
    return new Set<string>();
  }

  const existingMessages = await Message.findAll({
    attributes: ["id"],
    where: {
      id: {
        [Op.in]: normalizedMessageIds
      }
    }
  });

  return new Set(
    existingMessages.map(message => message.id)
  );
};
const ClassifyWhatsAppReconciliationMessageService = async (
  messageId: string
): Promise<WhatsAppReconciliationMessageClassification> => {
  const normalizedMessageId =
    typeof messageId === "string" ? messageId.trim() : "";

  if (!normalizedMessageId) {
    throw new Error("ERR_INVALID_WHATSAPP_MESSAGE_ID");
  }

  const existingMessage = await Message.findByPk(normalizedMessageId, {
    attributes: ["id"]
  });

  return existingMessage ? "existing" : "new";
};

export default ClassifyWhatsAppReconciliationMessageService;
