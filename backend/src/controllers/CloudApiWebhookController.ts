import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import VerifyCloudApiSignature from "../services/CloudApiWebhookServices/VerifyCloudApiSignature";
import NormalizeCloudApiWebhook from "../services/CloudApiWebhookServices/NormalizeCloudApiWebhook";
import CloudApiClient from "../services/CloudApiServices/CloudApiClient";
import {
  handleMessage,
  MediaPayload
} from "../handlers/handleWhatsappEvents";

const getQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }

  return String(value || "");
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

  const normalizedMessages = NormalizeCloudApiWebhook(
    req.body,
    whatsapp.id
  );

  for (const normalizedMessage of normalizedMessages) {
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