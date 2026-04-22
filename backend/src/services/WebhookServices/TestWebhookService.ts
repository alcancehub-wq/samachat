import Webhook from "../../models/Webhook";
import WebhookLog from "../../models/WebhookLog";
import Integration from "../../models/Integration";
import AppError from "../../errors/AppError";
import sendWebhookRequest from "./webhookSender";

interface Response {
  statusCode: number | null;
  responseBody: string;
  durationMs: number;
  attempted?: number;
}

const TestWebhookService = async (
  webhookId: string | number
): Promise<Response> => {
  const webhook = await Webhook.findByPk(webhookId, {
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

  const payload = {
    event: "webhook.test",
    webhook: {
      id: webhook.id,
      name: webhook.name,
      integrationId: webhook.integrationId
    },
    integration: webhook.integration || null,
    timestamp: new Date().toISOString()
  };

  let headers: Record<string, string> | null = null;
  if (webhook.headers) {
    try {
      const parsed = JSON.parse(webhook.headers);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        headers = Object.entries(parsed).reduce<Record<string, string>>(
          (acc, [key, val]) => {
            if (val !== null && val !== undefined) {
              acc[key] = String(val);
            }
            return acc;
          },
          {}
        );
      }
    } catch (error) {
      headers = null;
    }
  }

  try {
    const result = await sendWebhookRequest({
      url: webhook.url,
      method: webhook.method,
      payload,
      secret: webhook.secret,
      event: "webhook.test",
      headers
    });

    await WebhookLog.create({
      webhookId: webhook.id,
      event: "webhook.test",
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      requestBody: JSON.stringify(payload),
      responseBody: result.responseBody || null,
      error: null
    });

    await webhook.update({ lastTestAt: new Date() });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook test failed";

    await WebhookLog.create({
      webhookId: webhook.id,
      event: "webhook.test",
      statusCode: null,
      durationMs: null,
      requestBody: JSON.stringify(payload),
      responseBody: null,
      error: message
    });

    await webhook.update({ lastTestAt: new Date() });

    throw new AppError("ERR_WEBHOOK_TEST_FAILED", 400);
  }
};

export default TestWebhookService;
