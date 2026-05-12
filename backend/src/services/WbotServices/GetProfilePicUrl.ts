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
    return profilePicUrl;
  } catch (err) {
    logger.warn(err, "Failed to fetch profile picture");
    return "";
  }
};

export default GetProfilePicUrl;
