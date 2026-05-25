import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  ticket: Ticket;
  userId: string | number;
  profile?: string;
}

const getUserScopedWhatsappId = (user: any): number | null => {
  return user?.whatsappId || user?.whatsapp?.id || null;
};

const CheckTicketAccess = async ({
  ticket,
  userId,
  profile
}: Request): Promise<void> => {
  const isAdmin = String(profile || "").toLowerCase() === "admin";

  if (isAdmin) {
    return;
  }

  const user = await ShowUserService(userId);
  const userWhatsappId = getUserScopedWhatsappId(user);

  if (Number(ticket.userId) === Number(userId)) {
    if (
      !userWhatsappId ||
      Number(ticket.whatsappId) === Number(userWhatsappId)
    ) {
      return;
    }
  }

  if (userWhatsappId && Number(ticket.whatsappId) !== Number(userWhatsappId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default CheckTicketAccess;