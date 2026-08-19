import Message from "../../models/Message";

export type WhatsAppReconciliationMessageClassification =
  | "new"
  | "existing";

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
