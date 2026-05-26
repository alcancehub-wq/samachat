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

const getUserQueueIds = (user: any): number[] => {
  const queues = Array.isArray(user?.queues) ? user.queues : [];

  return queues
    .map((queue: { id: string | number }) => Number(queue.id))
    .filter((queueId: number) => Number.isInteger(queueId) && queueId > 0);
};

const canPreviewPendingTicket = (ticket: Ticket, user: any): boolean => {
  if (ticket.status !== "pending" || ticket.userId !== null) {
    return false;
  }

  const userWhatsappId = getUserScopedWhatsappId(user);
  const userQueueIds = getUserQueueIds(user);
  const hasQueueAccess =
    ticket.queueId !== null &&
    ticket.queueId !== undefined &&
    userQueueIds.includes(Number(ticket.queueId));
  const hasDirectWhatsappAccess =
    ticket.queueId === null &&
    Boolean(userWhatsappId) &&
    Number(ticket.whatsappId) === Number(userWhatsappId);

  return hasQueueAccess || hasDirectWhatsappAccess;
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
    return;
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