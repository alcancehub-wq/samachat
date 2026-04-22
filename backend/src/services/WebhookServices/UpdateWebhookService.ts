import AppError from "../../errors/AppError";
import Webhook from "../../models/Webhook";
import Integration from "../../models/Integration";
import { stringifyWebhookEvents, WebhookEvent } from "./webhookEvents";

interface WebhookData {
  name?: string;
  url?: string;
  method?: string;
  events?: WebhookEvent[];
  integrationId?: number | null;
  isActive?: boolean;
  headers?: Record<string, string> | null;
}

interface Request {
  webhookId: string;
  webhookData: WebhookData;
}

const allowedMethods = ["POST", "PUT", "PATCH", "DELETE"];
const isAllowedProtocol = (value: string): boolean => {
  return value === "http:" || value === "https:";
};

const UpdateWebhookService = async ({
  webhookId,
  webhookData
}: Request): Promise<Webhook> => {
  const webhook = await Webhook.findOne({
    where: { id: webhookId }
  });

  if (!webhook) {
    throw new AppError("ERR_NO_WEBHOOK_FOUND", 404);
  }

  const nextName = webhookData.name ? webhookData.name.trim() : undefined;

  if (nextName && nextName !== webhook.name) {
    const existing = await Webhook.findOne({
      where: { name: nextName }
    });

    if (existing) {
      throw new AppError("ERR_DUPLICATED_WEBHOOK");
    }
  }

  if (webhookData.integrationId) {
    const integration = await Integration.findByPk(webhookData.integrationId);
    if (!integration) {
      throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
    }
  }

  if (webhookData.url) {
    const parsedUrl = new URL(webhookData.url);
    if (!isAllowedProtocol(parsedUrl.protocol)) {
      throw new AppError("ERR_WEBHOOK_URL_INVALID");
    }
  }

  const normalizedMethod = webhookData.method
    ? webhookData.method.toUpperCase()
    : undefined;

  if (normalizedMethod && !allowedMethods.includes(normalizedMethod)) {
    throw new AppError("ERR_WEBHOOK_METHOD_INVALID");
  }

  const headersValue =
    webhookData.headers !== undefined
      ? webhookData.headers && Object.keys(webhookData.headers).length > 0
        ? JSON.stringify(webhookData.headers)
        : null
      : undefined;

  await webhook.update({
    name: nextName ?? webhook.name,
    url: webhookData.url ?? webhook.url,
    method: normalizedMethod ?? webhook.method,
    events:
      webhookData.events !== undefined
        ? stringifyWebhookEvents(webhookData.events)
        : webhook.events,
    integrationId:
      typeof webhookData.integrationId === "number"
        ? webhookData.integrationId
        : webhook.integrationId,
    isActive:
      typeof webhookData.isActive === "boolean"
        ? webhookData.isActive
        : webhook.isActive,
    headers: headersValue === undefined ? webhook.headers : headersValue
  });

  await webhook.reload();

  return webhook;
};

export default UpdateWebhookService;
