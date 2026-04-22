import Webhook from "../../models/Webhook";
import WebhookLog from "../../models/WebhookLog";
import { parseWebhookEvents, WebhookEvent } from "./webhookEvents";
import sendWebhookRequest from "./webhookSender";

interface Request {
  event: WebhookEvent;
  resource: string;
  resourceId?: number | string | null;
  data?: unknown;
}

const buildPayload = ({
  event,
  resource,
  resourceId,
  data
}: Request): Record<string, unknown> => {
  const basePayload: Record<string, unknown> = {
    event,
    resource: {
      type: resource,
      id: resourceId ?? null
    },
    data: data ?? null,
    timestamp: new Date().toISOString()
  };

  if (event === "tag.created" && data && typeof data === "object") {
    const nameValue = (data as { name?: unknown }).name;
    if (typeof nameValue === "string" && nameValue.trim()) {
      basePayload.text = nameValue.trim();
    }
  }

  return basePayload;
};

const buildLeadWebhookPayload = (data?: unknown): Record<string, unknown> => {
  const nameValue =
    data && typeof data === "object"
      ? (data as { name?: unknown }).name
      : undefined;

  const name = typeof nameValue === "string" && nameValue.trim()
    ? nameValue.trim()
    : "Lead";

  return {
    form_id: "33aaf338",
    form_type: "form",
    form_name: "Novo formulário",
    form_data: {
      name,
      message: name,
      field_2e8a039: "dhajsnzjajab@gmail.com"
    },
    form_meta: {
      date: {
        title: "Data",
        value: "março 18, 2026"
      },
      time: {
        title: "Horário",
        value: "12:59 pm"
      },
      page_url: {
        title: "URL da página",
        value: "https://samacon.com.br/"
      },
      user_agent: {
        title: "Agente de usuário",
        value: "Mozilla/5.0 ..."
      },
      remote_ip: {
        title: "IP remoto",
        value: "179.125.71.230"
      },
      credit: {
        title: "Desenvolvido por",
        value: "Elementor"
      }
    },
    form_files: []
  };
};

const parseHeaders = (value?: string | null): Record<string, string> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, val]) => {
      if (val === null || val === undefined) {
        return acc;
      }
      acc[key] = String(val);
      return acc;
    }, {});
  } catch (error) {
    return null;
  }
};

const TriggerWebhooksService = async ({
  event,
  resource,
  resourceId,
  data
}: Request): Promise<void> => {
  let webhooks: Webhook[] = [];

  try {
    webhooks = await Webhook.findAll({ where: { isActive: true } });
  } catch (error) {
    return;
  }

  await Promise.all(
    webhooks.map(async webhook => {
      const events = parseWebhookEvents(webhook.events);
      if (!events.includes(event)) {
        return;
      }

      const payload =
        event === "tag.created" && webhook.url.includes("/lead-webhook")
          ? buildLeadWebhookPayload(data)
          : buildPayload({ event, resource, resourceId, data });

      const headers = parseHeaders(webhook.headers);

      try {
        const result = await sendWebhookRequest({
          url: webhook.url,
          method: webhook.method,
          payload,
          secret: webhook.secret,
          event,
          headers
        });

        await WebhookLog.create({
          webhookId: webhook.id,
          event,
          statusCode: result.statusCode,
          durationMs: result.durationMs,
          requestBody: JSON.stringify(payload),
          responseBody: result.responseBody || null,
          error: null
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Webhook request failed";

        await WebhookLog.create({
          webhookId: webhook.id,
          event,
          statusCode: null,
          durationMs: null,
          requestBody: JSON.stringify(payload),
          responseBody: null,
          error: message
        });
      }
    })
  );
};

export default TriggerWebhooksService;
