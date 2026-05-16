import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  ticket: Ticket;
  userId: string | number;
  profile?: string;
}

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
    if (
      !user.whatsappId ||
      Number(ticket.whatsappId) === Number(user.whatsappId)
    ) {
      return;
    }
  }

  if (user.whatsappId && Number(ticket.whatsappId) !== Number(user.whatsappId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default CheckTicketAccess;