import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Webhook from "../../models/Webhook";
import Integration from "../../models/Integration";
import { stringifyWebhookEvents, WebhookEvent } from "./webhookEvents";

interface Request {
  name: string;
  url: string;
  method?: string;
  events?: WebhookEvent[];
  integrationId?: number | null;
  isActive?: boolean;
  headers?: Record<string, string> | null;
}

const allowedMethods = ["POST", "PUT", "PATCH", "DELETE"];
const isAllowedProtocol = (value: string): boolean => {
  return value === "http:" || value === "https:";
};

const CreateWebhookService = async ({
  name,
  url,
  method = "POST",
  events,
  integrationId,
  isActive = true,
  headers
}: Request): Promise<Webhook> => {
  const trimmedName = name.trim();

  const existing = await Webhook.findOne({
    where: { name: trimmedName }
  });

  if (existing) {
    throw new AppError("ERR_DUPLICATED_WEBHOOK");
  }

  if (integrationId) {
    const integration = await Integration.findByPk(integrationId);
    if (!integration) {
      throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
    }
  }

  const parsedUrl = new URL(url);
  if (!isAllowedProtocol(parsedUrl.protocol)) {
    throw new AppError("ERR_WEBHOOK_URL_INVALID");
  }

  const normalizedMethod = method.toUpperCase();
  if (!allowedMethods.includes(normalizedMethod)) {
    throw new AppError("ERR_WEBHOOK_METHOD_INVALID");
  }

  const headersValue = headers && Object.keys(headers).length > 0
    ? JSON.stringify(headers)
    : null;

  const webhook = await Webhook.create({
    name: trimmedName,
    url,
    method: normalizedMethod,
    events: stringifyWebhookEvents(events),
    integrationId: integrationId || null,
    isActive,
    secret: uuidv4(),
    headers: headersValue
  });

  return webhook;
};

export default CreateWebhookService;
