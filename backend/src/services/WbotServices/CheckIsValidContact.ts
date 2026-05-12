import AppError from "../../errors/AppError";
import ResolveWhatsAppContext from "../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../providers/WhatsApp";

interface Request {
  userId?: number;
  whatsappId?: number;
}

const CheckIsValidContact = async (
  number: string,
  options: Request = {}
): Promise<void> => {
  const defaultWhatsapp = await ResolveWhatsAppContext(options);

  try {
    const isValidNumber = await whatsappProvider.checkNumber(
      defaultWhatsapp.id,
      number
    );
    if (!isValidNumber) {
      throw new AppError("invalidNumber");
    }
  } catch (err) {
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
