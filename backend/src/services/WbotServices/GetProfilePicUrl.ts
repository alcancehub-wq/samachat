import ResolveWhatsAppContext from "../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";

interface Request {
  userId?: number;
  whatsappId?: number;
}

const GetProfilePicUrl = async (
  number: string,
  options: Request = {}
): Promise<string> => {
  const defaultWhatsapp = await ResolveWhatsAppContext(options);

  try {
    const profilePicUrl = await whatsappProvider.getProfilePicUrl(
      defaultWhatsapp.id,
      number
    );
    logger.info(
      {
        event: "p05_profile_pic_lookup",
        whatsappId: defaultWhatsapp.id,
        number,
        provider: process.env.WHATSAPP_PROVIDER || "wwebjs",
        result: profilePicUrl ? "present" : "empty"
      },
      "Profile picture lookup completed"
    );
    return profilePicUrl;
  } catch (err) {
    logger.warn(
      {
        event: "p05_profile_pic_lookup",
        whatsappId: defaultWhatsapp.id,
        number,
        provider: process.env.WHATSAPP_PROVIDER || "wwebjs",
        result: "error",
        errorName: err instanceof Error ? err.name : null,
        errorMessage: err instanceof Error ? err.message : String(err)
      },
      "Profile picture lookup failed"
    );
    return "";
  }
};

export default GetProfilePicUrl;
