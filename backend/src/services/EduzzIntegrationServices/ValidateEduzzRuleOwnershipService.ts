import AppError from "../../errors/AppError";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  userId: number;
  whatsappId: number;
}

interface Response {
  user: User;
  whatsapp: Whatsapp;
}

const ValidateEduzzRuleOwnershipService = async ({
  userId,
  whatsappId
}: Request): Promise<Response> => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError("ERR_EDUZZ_USER_NOT_FOUND", 404);
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId);

  if (!whatsapp) {
    throw new AppError("ERR_EDUZZ_WHATSAPP_NOT_FOUND", 404);
  }

  if (!user.whatsappId || user.whatsappId !== whatsapp.id) {
    throw new AppError("ERR_EDUZZ_USER_WHATSAPP_MISMATCH", 409);
  }

  return {
    user,
    whatsapp
  };
};

export default ValidateEduzzRuleOwnershipService;
