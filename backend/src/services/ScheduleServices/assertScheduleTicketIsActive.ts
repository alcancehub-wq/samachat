import AppError from "../../errors/AppError";

export const ERR_SCHEDULE_TICKET_CLOSED = "ERR_SCHEDULE_TICKET_CLOSED";

interface TicketLike {
  status?: string | null;
}

export const isClosedScheduleTicket = (
  ticket?: TicketLike | null
): boolean => String(ticket?.status || "").toLowerCase() === "closed";

const assertScheduleTicketIsActive = (ticket?: TicketLike | null): void => {
  if (isClosedScheduleTicket(ticket)) {
    throw new AppError(ERR_SCHEDULE_TICKET_CLOSED);
  }
};

export default assertScheduleTicketIsActive;