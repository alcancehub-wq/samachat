import Webhook from "../../models/Webhook";
import WebhookLog from "../../models/WebhookLog";
import AppError from "../../errors/AppError";

const DeleteWebhookService = async (id: string | number): Promise<void> => {
  const webhook = await Webhook.findByPk(id);

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  await WebhookLog.destroy({ where: { webhookId: id } });
  await webhook.destroy();
};

export default DeleteWebhookService;
