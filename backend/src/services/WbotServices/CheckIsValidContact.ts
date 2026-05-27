import AppError from "../../errors/AppError";
import BuildContactNumberCandidates from "../../helpers/BuildContactNumberCandidates";
import IsPlausiblePhoneNumber from "../../helpers/IsPlausiblePhoneNumber";
import ResolveWhatsAppContext from "../../helpers/ResolveWhatsAppContext";
import { whatsappProvider } from "../../providers/WhatsApp";
import { logger } from "../../utils/logger";

interface Request {
  userId?: number;
  whatsappId?: number;
}

const CheckIsValidContact = async (
  number: string,
  options: Request = {}
): Promise<void> => {
  if (!IsPlausiblePhoneNumber(number)) {
    throw new AppError("ERR_WAPP_INVALID_CONTACT");
  }

  const defaultWhatsapp = await ResolveWhatsAppContext(options);
  const candidates = BuildContactNumberCandidates(
    number,
    defaultWhatsapp.phoneNumber
  );

  try {
    const validatedNumber = await whatsappProvider.checkNumber(
      defaultWhatsapp.id,
      number
    );

    if (!validatedNumber) {
      logger.warn(
        {
          flow: "contacts",
          whatsappId: defaultWhatsapp.id,
          number,
          candidates
        },
        "CheckIsValidContact lookup returned no confirmed number"
      );

      throw new AppError("ERR_WAPP_CHECK_CONTACT");
    }
  } catch (err) {
    if (err instanceof AppError) {
      if (err.message === "ERR_NUMBER_NOT_ON_WHATSAPP") {
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }

      if (
        err.message === "ERR_WAPP_NOT_INITIALIZED" ||
        err.message === "ERR_WAPP_CHECK_CONTACT"
      ) {
        throw err;
      }
    }

    logger.warn(
      {
        flow: "contacts",
        whatsappId: defaultWhatsapp.id,
        number,
        candidates,
        err
      },
      "CheckIsValidContact provider lookup failed"
    );

    if (err instanceof AppError && err.message === "ERR_WAPP_INVALID_CONTACT") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }

    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
