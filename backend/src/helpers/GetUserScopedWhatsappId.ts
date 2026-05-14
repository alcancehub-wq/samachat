import ShowUserService from "../services/UserServices/ShowUserService";

const GetUserScopedWhatsappId = async (
  userId?: string | number,
  profile?: string
): Promise<number | null> => {
  const isAdmin = String(profile || "").toLowerCase() === "admin";

  if (isAdmin || !userId) {
    return null;
  }

  const user = await ShowUserService(userId);

  return user.whatsappId || user.whatsapp?.id || null;
};

export default GetUserScopedWhatsappId;