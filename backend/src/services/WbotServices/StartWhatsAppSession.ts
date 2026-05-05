import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import { enqueueWhatsAppSessionStart } from "./WhatsAppSessionStartQueue";

interface StartWhatsAppSessionOptions {
  reason?: string;
}

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  options: StartWhatsAppSessionOptions = {}
): Promise<void> => {
  const reason = options.reason || "direct_request";

  return enqueueWhatsAppSessionStart(
    whatsapp,
    { reason, sessionName: whatsapp.name },
    async () => {
      if (whatsappProvider.isSessionActive(whatsapp.id)) {
        logger.warn(
          {
            whatsappId: whatsapp.id,
            sessionName: whatsapp.name,
            status: whatsapp.status,
            reason
          },
          "Skipping WhatsApp session start because a client is already active"
        );
        return;
      }

      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName: whatsapp.name,
          reason
        },
        "Starting WhatsApp session"
      );

      await whatsapp.update({ status: "OPENING" });

      const io = getIO();
      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });

      try {
        await whatsappProvider.init(whatsapp);
      } catch (err) {
        logger.error(
          {
            err,
            whatsappId: whatsapp.id,
            sessionName: whatsapp.name,
            reason
          },
          "Error starting WhatsApp session"
        );
      }
    }
  );
};
