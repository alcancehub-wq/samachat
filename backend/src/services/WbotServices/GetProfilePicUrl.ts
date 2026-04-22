import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";

const GetProfilePicUrl = async (number: string): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp();

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
