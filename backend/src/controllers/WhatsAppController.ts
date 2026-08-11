import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import GetWhatsAppSharingSettingsService from "../services/WhatsappService/GetWhatsAppSharingSettingsService";
import { whatsappProvider } from "../providers/WhatsApp";
import SerializeWhatsAppForClient from "../helpers/SerializeWhatsAppForClient";

interface SharingSettingsData {
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode?: string | null;
  distributionUserIds?: number[];
}

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  linkedUserId?: number | null;
  linkedUserIds?: number[];
  linkedUserSignMessages?: boolean;
  providerType?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  apiVersion?: string;
  sharingSettings?: SharingSettingsData;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();

  return res
    .status(200)
    .json(whatsapps.map(SerializeWhatsAppForClient));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    linkedUserId,
    linkedUserIds,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion,
    sharingSettings
  }: WhatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    linkedUserId,
    linkedUserIds,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion,
    sharingSettings
  });

  const formattedWhatsApp = await ShowWhatsAppService(whatsapp.id);
  const formattedOldDefaultWhatsapp = oldDefaultWhatsapp
    ? await ShowWhatsAppService(oldDefaultWhatsapp.id)
    : null;

  if (formattedWhatsApp.providerType !== "official") {
    StartWhatsAppSession(formattedWhatsApp, { reason: "create" });
  }

  const serializedWhatsApp =
    SerializeWhatsAppForClient(formattedWhatsApp);
  const savedSharingSettings =
    await GetWhatsAppSharingSettingsService(formattedWhatsApp.id);
  const responseWhatsApp = {
    ...serializedWhatsApp,
    sharingSettings: savedSharingSettings
  };
  const serializedOldDefaultWhatsapp = formattedOldDefaultWhatsapp
    ? SerializeWhatsAppForClient(formattedOldDefaultWhatsapp)
    : null;

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: serializedWhatsApp
  });

  if (serializedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: serializedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(responseWhatsApp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId);
  const sharingSettings =
    await GetWhatsAppSharingSettingsService(whatsapp.id);

  return res.status(200).json({
    ...SerializeWhatsAppForClient(whatsapp),
    sharingSettings
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId
  });

  const formattedWhatsApp = await ShowWhatsAppService(whatsapp.id);
  const formattedOldDefaultWhatsapp = oldDefaultWhatsapp
    ? await ShowWhatsAppService(oldDefaultWhatsapp.id)
    : null;

  const serializedWhatsApp =
    SerializeWhatsAppForClient(formattedWhatsApp);
  const savedSharingSettings =
    await GetWhatsAppSharingSettingsService(formattedWhatsApp.id);
  const responseWhatsApp = {
    ...serializedWhatsApp,
    sharingSettings: savedSharingSettings
  };
  const serializedOldDefaultWhatsapp = formattedOldDefaultWhatsapp
    ? SerializeWhatsAppForClient(formattedOldDefaultWhatsapp)
    : null;

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: serializedWhatsApp
  });

  if (serializedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: serializedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(responseWhatsApp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  await DeleteWhatsAppService(whatsappId);
  await whatsappProvider.removeSession(+whatsappId);

  const io = getIO();
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  if (whatsapp.providerType === "official") {
    return res.status(400).json({
      message: "Official Cloud API connections do not use QR sessions."
    });
  }

  await whatsappProvider.removeSession(whatsapp.id);
  void StartWhatsAppSession(whatsapp, { reason: "manual_restart" });

  return res.status(200).json({ message: "Restarting session." });
};
