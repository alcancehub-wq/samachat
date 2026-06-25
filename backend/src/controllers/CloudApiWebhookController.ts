import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";

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
