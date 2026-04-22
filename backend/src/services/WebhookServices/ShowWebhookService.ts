import Webhook from "../../models/Webhook";
import Integration from "../../models/Integration";
import AppError from "../../errors/AppError";

const ShowWebhookService = async (
  id: string | number
): Promise<Webhook> => {
  const webhook = await Webhook.findByPk(id, {
    include: [
      {
        model: Integration,
        attributes: ["id", "name", "type"]
      }
    ]
  });

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  return webhook;
};

export default ShowWebhookService;
