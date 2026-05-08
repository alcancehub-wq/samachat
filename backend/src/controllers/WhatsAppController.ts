import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import { whatsappProvider } from "../providers/WhatsApp";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  linkedUserId?: number | null;
  linkedUserSignMessages?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();

  return res.status(200).json(whatsapps);
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
    linkedUserSignMessages
  }: WhatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    linkedUserId,
    linkedUserSignMessages
  });

  const formattedWhatsApp = await ShowWhatsAppService(whatsapp.id);
  const formattedOldDefaultWhatsapp = oldDefaultWhatsapp
    ? await ShowWhatsAppService(oldDefaultWhatsapp.id)
    : null;

  StartWhatsAppSession(formattedWhatsApp, { reason: "create" });

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: formattedWhatsApp
  });

  if (formattedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: formattedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(formattedWhatsApp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId);

  return res.status(200).json(whatsapp);
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

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: formattedWhatsApp
  });

  if (formattedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: formattedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(formattedWhatsApp);
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

  await whatsappProvider.removeSession(whatsapp.id);
  void StartWhatsAppSession(whatsapp, { reason: "manual_restart" });

  return res.status(200).json({ message: "Restarting session." });
};
