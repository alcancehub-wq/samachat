import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import CheckTicketAccess from "../TicketServices/CheckTicketAccess";
import ShowTicketService, { TicketAccessData } from "../TicketServices/ShowTicketService";

export interface ScheduleAccessData extends TicketAccessData {}

type ScheduleWithTicket = {
  ticketId?: number | null;
  ticket?: Ticket | null;
};

export const isAdminScheduleAccess = (
  accessData?: ScheduleAccessData
): boolean => String(accessData?.profile || "").toLowerCase() === "admin";

const assertNonAdminScheduleHasTicket = (
  ticketId: number | null | undefined,
  accessData?: ScheduleAccessData
): void => {
  if (!accessData || isAdminScheduleAccess(accessData)) {
    return;
  }

  if (ticketId === null || ticketId === undefined) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export const loadScheduleTicketForAccess = async (
  ticketId: number | null | undefined,
  accessData?: ScheduleAccessData
): Promise<Ticket | null> => {
  assertNonAdminScheduleHasTicket(ticketId, accessData);

  if (ticketId === null || ticketId === undefined) {
    return null;
  }

  if (accessData) {
    return ShowTicketService(ticketId, accessData);
  }

  const ticket = await Ticket.findByPk(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export const assertScheduleAccess = async (
  schedule: ScheduleWithTicket,
  accessData?: ScheduleAccessData
): Promise<void> => {
  if (!accessData || isAdminScheduleAccess(accessData)) {
    return;
  }

  assertNonAdminScheduleHasTicket(schedule.ticketId, accessData);

  if (!schedule.ticket) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await CheckTicketAccess({
    ticket: schedule.ticket,
    userId: accessData.userId,
    profile: accessData.profile
  });
};