import ResolveWhatsAppContext from "../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../providers/WhatsApp";

interface Request {
  userId?: number;
  whatsappId?: number;
}

const CheckContactNumber = async (
  number: string,
  options: Request = {}
): Promise<string> => {
  const defaultWhatsapp = await ResolveWhatsAppContext(options);

  const validNumber = await whatsappProvider.checkNumber(
    defaultWhatsapp.id,
    number
  );
  return validNumber;
};

export default CheckContactNumber;
