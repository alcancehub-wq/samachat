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
    return;
  }

  const user = await ShowUserService(userId);
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