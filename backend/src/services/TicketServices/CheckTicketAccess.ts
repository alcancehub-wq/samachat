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

  if (Number(ticket.userId) === Number(userId)) {
    const ownerUser = await ShowUserService(userId);
    if (
      !ownerUser.whatsappId ||
      Number(ticket.whatsappId) === Number(ownerUser.whatsappId)
    ) {
      return;
    }
  }

  const user = await ShowUserService(userId);
  if (user.whatsappId && Number(ticket.whatsappId) !== Number(user.whatsappId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const userQueueIds = user.queues?.map(queue => queue.id) || [];
  const canAccessPendingTicket =
    ticket.status === "pending" &&
    (!ticket.queueId || userQueueIds.includes(ticket.queueId));

  if (canAccessPendingTicket) {
    return;
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default CheckTicketAccess;