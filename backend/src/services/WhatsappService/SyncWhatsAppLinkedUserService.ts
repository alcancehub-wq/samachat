import AppError from "../../errors/AppError";
import User from "../../models/User";

interface Request {
  whatsappId: number;
  linkedUserId?: number | null;
  linkedUserSignMessages?: boolean;
}

const SyncWhatsAppLinkedUserService = async ({
  whatsappId,
  linkedUserId,
  linkedUserSignMessages
}: Request): Promise<void> => {
  if (linkedUserId === undefined) {
    return;
  }

  await User.update(
    { whatsappId: null },
    {
      where: { whatsappId }
    }
  );

  if (linkedUserId === null) {
    return;
  }

  const user = await User.findByPk(linkedUserId);

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const updateData: { whatsappId: number; signMessages?: boolean } = {
    whatsappId
  };

  if (typeof linkedUserSignMessages === "boolean") {
    updateData.signMessages = linkedUserSignMessages;
  }

  await user.update(updateData);
};

export default SyncWhatsAppLinkedUserService;