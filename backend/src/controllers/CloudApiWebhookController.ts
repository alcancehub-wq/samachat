import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import VerifyCloudApiSignature from "../services/CloudApiWebhookServices/VerifyCloudApiSignature";
import NormalizeCloudApiWebhook from "../services/CloudApiWebhookServices/NormalizeCloudApiWebhook";
import ProcessCloudApiHistoryWebhook from "../services/CloudApiWebhookServices/ProcessCloudApiHistoryWebhook";
import ProcessCloudApiMessageEchoWebhook from "../services/CloudApiWebhookServices/ProcessCloudApiMessageEchoWebhook";
import CloudApiClient from "../services/CloudApiServices/CloudApiClient";
import { logger } from "../utils/logger";
import {
  handleMessage,
  handleMessageAck,
  MediaPayload
} from "../handlers/handleWhatsappEvents";
import { MessageAck } from "../providers/WhatsApp/types";

declare const process: {
  env: Record<string, string | undefined>;
};

const getQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }

  return String(value || "");
};

const describePayloadShape = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      items: value.length > 0 ? describePayloadShape(value[0]) : undefined
    };
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    return Object.keys(objectValue).reduce(
      (shape, key) => ({
        ...shape,
        [key]: describePayloadShape(objectValue[key])
      }),
      {} as Record<string, unknown>
    );
  }

  return typeof value;
};

const cloudApiStatusToAck: Record<string, MessageAck> = {
  sent: 1,
  delivered: 2,
  read: 3
};

const processCloudApiStatuses = async (payload: any): Promise<void> => {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") {
        continue;
      }

      for (const status of change.value?.statuses || []) {
        const ack = cloudApiStatusToAck[status?.status];

        if (!status?.id || ack === undefined) {
          continue;
        }

        await handleMessageAck(status.id, ack);
      }
    }
  }
};

export const verify = async (req: Request, res: Response): Promise<Response> => {
  const whatsappId = Number(req.params.whatsappId);

  if (!whatsappId || Number.isNaN(whatsappId)) {
    throw new AppError("ERR_CLOUD_API_INVALID_WHATSAPP_ID", 400);
  }

  const mode = getQueryValue(req.query["hub.mode"]);
  const token = getQueryValue(req.query["hub.verify_token"]);
  const challenge = getQueryValue(req.query["hub.challenge"]);

  if (mode !== "subscribe" || !token || !challenge) {
    throw new AppError("ERR_CLOUD_API_INVALID_VERIFY_REQUEST", 400);
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);

  if (!whatsapp || whatsapp.providerType !== "official") {
    throw new AppError("ERR_CLOUD_API_WHATSAPP_NOT_FOUND", 404);
  }

  if (!whatsapp.verifyToken || whatsapp.verifyToken !== token) {
    throw new AppError("ERR_CLOUD_API_VERIFY_TOKEN_MISMATCH", 403);
  }

  return res.status(200).send(challenge);
};

export const receive = async (req: Request, res: Response): Promise<Response> => {
  const whatsappId = Number(req.params.whatsappId);

  if (!whatsappId || Number.isNaN(whatsappId)) {
    throw new AppError("ERR_CLOUD_API_INVALID_WHATSAPP_ID", 400);
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);

  if (!whatsapp || whatsapp.providerType !== "official") {
    throw new AppError("ERR_CLOUD_API_WHATSAPP_NOT_FOUND", 404);
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const signature = req.headers["x-hub-signature-256"];

  const validSignature = VerifyCloudApiSignature({
    appSecret: whatsapp.appSecret,
    rawBody,
    signature
  });

  if (!validSignature) {
    await whatsapp.update({
      cloudApiStatus: "signature_error",
      cloudApiLastError: "ERR_CLOUD_API_INVALID_SIGNATURE"
    });

    throw new AppError("ERR_CLOUD_API_INVALID_SIGNATURE", 403);
  }

  const historyEntries: any[] = [];
  const realtimeEntries: any[] = [];

  for (const entry of req.body?.entry || []) {
    const historyChanges = (entry.changes || []).filter(
      (change: any) => change.field === "history"
    );

    const realtimeChanges = (entry.changes || []).filter(
      (change: any) => change.field !== "history"
    );

    if (historyChanges.length > 0) {
      historyEntries.push({
        ...entry,
        changes: historyChanges
      });
    }

    if (realtimeChanges.length > 0) {
      realtimeEntries.push({
        ...entry,
        changes: realtimeChanges
      });
    }
  }

  if (
    historyEntries.length > 0 &&
    process.env.CLOUD_API_HISTORY_CAPTURE === "true" &&
    rawBody
  ) {
    logger.info(
      {
        event: "cloud_api_history_webhook_capture",
        whatsappId: whatsapp.id,
        payloadShape: describePayloadShape({
          ...req.body,
          entry: historyEntries
        })
      },
      "Cloud API history webhook shape captured"
    );
  }

  if (historyEntries.length > 0) {
    await ProcessCloudApiHistoryWebhook({
      payload: {
        ...req.body,
        entry: historyEntries
      },
      whatsappId: whatsapp.id
    });
  }

  await processCloudApiStatuses(req.body);

  const hasStructuredEntries = Array.isArray(req.body?.entry);

  const realtimePayload = hasStructuredEntries
    ? {
        ...req.body,
        entry: realtimeEntries
      }
    : req.body;

  const shouldNormalizeRealtime =
    !hasStructuredEntries ||
    req.body.entry.length === 0 ||
    realtimeEntries.length > 0;

  const normalizedMessages = shouldNormalizeRealtime
    ? NormalizeCloudApiWebhook(
        realtimePayload,
        whatsapp.id
      )
    : [];

  for (const normalizedMessage of normalizedMessages) {
    if (normalizedMessage.isCoexistenceMessageEcho) {
      await ProcessCloudApiMessageEchoWebhook({
        normalizedMessage
      });
      continue;
    }

    let mediaPayload: MediaPayload | undefined;

    if (normalizedMessage.cloudMedia) {
      const cloudApiClient = new CloudApiClient({
        accessToken: whatsapp.accessToken,
        phoneNumberId: whatsapp.phoneNumberId,
        apiVersion: whatsapp.apiVersion
      });

      const mediaMetadata = await cloudApiClient.retrieveMedia(
        normalizedMessage.cloudMedia.id
      );

      if (!mediaMetadata.url) {
        throw new AppError("ERR_CLOUD_API_MEDIA_URL_REQUIRED");
      }

      const downloadedMedia = await cloudApiClient.downloadMedia(
        mediaMetadata.url
      );

      mediaPayload = {
        filename: normalizedMessage.cloudMedia.filename || "",
        mimetype:
          downloadedMedia.mimetype ||
          mediaMetadata.mime_type ||
          normalizedMessage.cloudMedia.mimetype ||
          "application/octet-stream",
        data: downloadedMedia.data.toString("base64")
      };
    }

    await handleMessage(
      normalizedMessage.messagePayload,
      normalizedMessage.contactPayload,
      normalizedMessage.contextPayload,
      mediaPayload
    );
  }

  await whatsapp.update({
    cloudApiStatus: normalizedMessages.length > 0
      ? "message_received"
      : "webhook_received",
    cloudApiLastError: null
  });

  return res.status(200).send("EVENT_RECEIVED");
};