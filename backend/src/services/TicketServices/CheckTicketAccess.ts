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

const canPreviewPendingTicket = (ticket: Ticket, user: any): boolean => {
  if (ticket.status !== "pending" || ticket.userId !== null) {
    return false;
  }

  const userWhatsappId = getUserScopedWhatsappId(user);
  if (!userWhatsappId) {
    return false;
  }

  return Number(ticket.whatsappId) === Number(userWhatsappId);
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

  if (Number(ticket.userId) === Number(userId)) {
    return;
  }

  if (canPreviewPendingTicket(ticket, user)) {
    return;
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default CheckTicketAccess;