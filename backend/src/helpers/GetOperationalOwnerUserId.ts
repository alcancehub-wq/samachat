import User from "../models/User";

const GetOperationalOwnerUserId = async (
  whatsappId?: number | null
): Promise<number | null> => {
  if (!whatsappId) {
    return null;
  }

  const linkedUser = await User.findOne({
    where: { whatsappId },
    attributes: ["id"]
  });

  return linkedUser?.id || null;
};

export default GetOperationalOwnerUserId;