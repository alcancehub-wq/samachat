import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import ListWebhooksService from "../services/WebhookServices/ListWebhooksService";
import CreateWebhookService from "../services/WebhookServices/CreateWebhookService";
import ShowWebhookService from "../services/WebhookServices/ShowWebhookService";
import UpdateWebhookService from "../services/WebhookServices/UpdateWebhookService";
import DeleteWebhookService from "../services/WebhookServices/DeleteWebhookService";
import TestWebhookService from "../services/WebhookServices/TestWebhookService";
import ListWebhookLogsService from "../services/WebhookServices/ListWebhookLogsService";
import {
  parseWebhookEvents,
  webhookEvents,
  normalizeWebhookEvents,
  WebhookEvent
} from "../services/WebhookServices/webhookEvents";


type IndexQuery = {
  searchParam?: string;
  integrationId?: string;
  limit?: string;
};

interface WebhookData {
  name: string;
  url: string;
  method?: string;
  events?: WebhookEvent[];
  integrationId?: number | null;
  isActive?: boolean;
  headers?: Record<string, string> | null;
}

const parseWebhookHeaders = (value?: string | null): Record<string, string> | null => {
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

const serializeWebhook = (webhook: any) => {
  const data = typeof webhook?.toJSON === "function" ? webhook.toJSON() : webhook;

  return {
    ...data,
    events: parseWebhookEvents(webhook?.events),
    headers: parseWebhookHeaders(webhook?.headers)
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, integrationId } = req.query as IndexQuery;

  const webhooks = await ListWebhooksService({ searchParam, integrationId });

  return res.json(webhooks.map(serializeWebhook));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newWebhook: WebhookData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    url: Yup.string().url().required(),
    method: Yup.string(),
    events: Yup.array().of(Yup.string().oneOf([...webhookEvents])),
    integrationId: Yup.number().nullable(),
    isActive: Yup.boolean(),
    headers: Yup.object().nullable()
  });

  try {
    await schema.validate(newWebhook);
  } catch (err) {
    throw new AppError(err.message);
  }

  const webhook = await CreateWebhookService({
    ...newWebhook,
    events: normalizeWebhookEvents(newWebhook.events)
  });

  const enriched = await ShowWebhookService(webhook.id);
  const serializedWebhook = serializeWebhook(enriched);

  const io = getIO();
  io.emit("webhook", {
    action: "create",
    webhook: serializedWebhook
  });

  return res.status(200).json(serializedWebhook);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { webhookId } = req.params;

  const webhook = await ShowWebhookService(webhookId);

  return res.status(200).json(serializeWebhook(webhook));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const webhookData: WebhookData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    url: Yup.string().url(),
    method: Yup.string(),
    events: Yup.array().of(Yup.string().oneOf([...webhookEvents])),
    integrationId: Yup.number().nullable(),
    isActive: Yup.boolean(),
    headers: Yup.object().nullable()
  });

  try {
    await schema.validate(webhookData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { webhookId } = req.params;

  const webhook = await UpdateWebhookService({
    webhookId,
    webhookData: {
      ...webhookData,
      events:
        webhookData.events !== undefined
          ? normalizeWebhookEvents(webhookData.events)
          : undefined
    }
  });

  const enriched = await ShowWebhookService(webhook.id);
  const serializedWebhook = serializeWebhook(enriched);

  const io = getIO();
  io.emit("webhook", {
    action: "update",
    webhook: serializedWebhook
  });

  return res.status(200).json(serializedWebhook);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { webhookId } = req.params;

  await DeleteWebhookService(webhookId);

  const io = getIO();
  io.emit("webhook", {
    action: "delete",
    webhookId
  });

  return res.status(200).json({ message: "Webhook deleted" });
};

export const events = async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).json(webhookEvents);
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const { webhookId } = req.params;

  const result = await TestWebhookService(webhookId);

  return res.status(200).json(result);
};

export const logs = async (req: Request, res: Response): Promise<Response> => {
  const { webhookId } = req.params;
  const { limit } = req.query as IndexQuery;

  const logsData = await ListWebhookLogsService({
    webhookId,
    limit: limit ? Number(limit) : 20
  });

  return res.status(200).json(logsData);
};
