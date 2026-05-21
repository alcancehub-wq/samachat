import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  ticket: Ticket;
  userId: string | number;
  profile?: string;
}

const canPreviewPendingTicket = (ticket: Ticket, user: any): boolean => {
  if (ticket.status !== "pending" || ticket.userId !== null) {
    return false;
  }

  const userWhatsappId = user.whatsappId || user.whatsapp?.id || null;
  const userQueues = Array.isArray(user.queues) ? user.queues : [];
  const hasQueueAccess = ticket.queueId
    ? userQueues.some(
        (queue: { id: string | number }) =>
          Number(queue.id) === Number(ticket.queueId)
      )
    : userQueues.length > 0;

  return hasQueueAccess || Boolean(userWhatsappId);
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
  const userWhatsappId = user.whatsappId || user.whatsapp?.id || null;

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

  if (canPreviewPendingTicket(ticket, user)) {
    return;
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default CheckTicketAccess;