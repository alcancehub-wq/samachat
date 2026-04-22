export const webhookEvents = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "tag.created",
  "tag.updated",
  "tag.deleted",
  "list.created",
  "list.updated",
  "list.deleted",
  "dialog.created",
  "dialog.updated",
  "dialog.deleted",
  "campaign.created",
  "campaign.updated",
  "campaign.deleted",
  "integration.created",
  "integration.updated",
  "integration.deleted",
  "webhook.created",
  "webhook.updated",
  "webhook.deleted"
] as const;

export type WebhookEvent = (typeof webhookEvents)[number];

export const normalizeWebhookEvents = (events?: unknown): WebhookEvent[] => {
  if (!Array.isArray(events)) {
    return [];
  }

  const normalized = events.filter(event =>
    (webhookEvents as readonly string[]).includes(String(event))
  ) as WebhookEvent[];

  return Array.from(new Set(normalized));
};

export const stringifyWebhookEvents = (events?: unknown): string | null => {
  const normalized = normalizeWebhookEvents(events);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
};

export const parseWebhookEvents = (value?: string | null): WebhookEvent[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeWebhookEvents(parsed);
  } catch (error) {
    return [];
  }
};
