import WebhookLog from "../../models/WebhookLog";
import Webhook from "../../models/Webhook";
import AppError from "../../errors/AppError";

interface Request {
  webhookId: string | number;
  limit?: number;
}

const ListWebhookLogsService = async ({
  webhookId,
  limit = 20
}: Request): Promise<WebhookLog[]> => {
  const webhook = await Webhook.findByPk(webhookId);

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  const logs = await WebhookLog.findAll({
    where: { webhookId },
    order: [["createdAt", "DESC"]],
    limit
  });

  return logs;
};

export default ListWebhookLogsService;
