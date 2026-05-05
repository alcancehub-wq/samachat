import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { logger } from "../../utils/logger";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  const whatsapps = await ListWhatsAppsService();

  if (whatsapps.length > 0) {
    logger.info(
      {
        totalSessions: whatsapps.length
      },
      "Queueing WhatsApp sessions during boot"
    );

    for (const whatsapp of whatsapps) {
      void StartWhatsAppSession(whatsapp, { reason: "boot" });
    }
  }
};
