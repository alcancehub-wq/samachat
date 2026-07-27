import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import { enqueueWhatsAppSessionStart } from "./WhatsAppSessionStartQueue";

interface StartWhatsAppSessionOptions {
  reason?: string;
  forceRestartActive?: boolean;
}

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  options: StartWhatsAppSessionOptions = {}
): Promise<void> => {
  const reason = options.reason || "direct_request";
  const forceRestartActive = options.forceRestartActive === true;

  return enqueueWhatsAppSessionStart(
    whatsapp,
    {
      reason,
      sessionName: whatsapp.name,
      onTimeout: async () => {
        if (whatsappProvider.isSessionReady(whatsapp.id)) {
          logger.info(
            {
              whatsappId: whatsapp.id,
              sessionName: whatsapp.name,
              reason
            },
            "Skipping timeout cleanup because the WhatsApp session is ready"
          );
          return;
        }

        logger.warn(
          {
            whatsappId: whatsapp.id,
            sessionName: whatsapp.name,
            reason
          },
          "Cleaning up WhatsApp session after start timeout"
        );

        await whatsappProvider.removeSession(whatsapp.id);
      }
    },
    async () => {
      if (whatsappProvider.isSessionReady(whatsapp.id)) {
        logger.info(
          {
            whatsappId: whatsapp.id,
            sessionName: whatsapp.name,
            status: whatsapp.status,
            reason
          },
          "Skipping WhatsApp recovery because the session became ready while queued"
        );
        return;
      }

      if (whatsappProvider.isSessionActive(whatsapp.id)) {
        if (forceRestartActive) {
          logger.warn(
            {
              whatsappId: whatsapp.id,
              sessionName: whatsapp.name,
              status: whatsapp.status,
              reason
            },
            "Restarting active WhatsApp session because recovery was explicitly requested"
          );

          await whatsappProvider.removeSession(whatsapp.id);
        } else {
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
