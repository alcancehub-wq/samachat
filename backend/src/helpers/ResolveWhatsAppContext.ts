import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";

interface Request {
  userId?: number;
  whatsappId?: number;
}

const ResolveWhatsAppContext = async ({
  userId,
  whatsappId
}: Request = {}): Promise<Whatsapp> => {
  if (whatsappId) {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new AppError("ERR_NO_WAPP_FOUND", 404);
    }

    return whatsapp;
  }

  return GetDefaultWhatsApp(userId);
};

export default ResolveWhatsAppContext;
