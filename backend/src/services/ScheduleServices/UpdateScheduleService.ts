import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";
import CreateScheduleLogService from "./CreateScheduleLogService";
import assertScheduleTicketIsActive from "./assertScheduleTicketIsActive";
import ShowScheduleService from "./ShowScheduleService";
import {
  ScheduleAccessData,
  isAdminScheduleAccess,
  loadScheduleTicketForAccess
} from "./scheduleAccess";

interface ScheduleData {
  body?: string;
  status?: string;
  scheduledAt?: Date | string | null;
  sentAt?: Date | string | null;
  canceledAt?: Date | string | null;
  lastError?: string | null;
  lastResult?: string | null;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
}

interface Request {
  scheduleId: string;
  scheduleData: ScheduleData;
  accessData?: ScheduleAccessData;
}

const normalizeDate = (value?: Date | string | null): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
};

const UpdateScheduleService = async ({
  scheduleId,
  scheduleData,
  accessData
}: Request): Promise<Schedule> => {
  const schedule = await ShowScheduleService(scheduleId, accessData);

  const nextBody =
    scheduleData.body !== undefined ? scheduleData.body.trim() : undefined;

  if (scheduleData.body !== undefined && !nextBody) {
    throw new AppError("ERR_SCHEDULE_BODY_REQUIRED");
  }

  if (scheduleData.assigneeId) {
    const assignee = await User.findByPk(scheduleData.assigneeId);
    if (!assignee) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }
  }

  if (schedule.ticketId !== null && schedule.ticketId !== undefined) {
    const currentTicket =
      (schedule as Schedule & { ticket?: Ticket | null }).ticket ||
      (await loadScheduleTicketForAccess(schedule.ticketId, accessData));

    assertScheduleTicketIsActive(currentTicket);
  }

  if (
    scheduleData.ticketId === null &&
    accessData &&
    !isAdminScheduleAccess(accessData)
  ) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (
    scheduleData.ticketId !== undefined &&
    scheduleData.ticketId !== null &&
    scheduleData.ticketId !== schedule.ticketId
  ) {
    const nextTicket = await loadScheduleTicketForAccess(
      scheduleData.ticketId,
      accessData
    );

    assertScheduleTicketIsActive(nextTicket);
  }

  if (scheduleData.contactId) {
    const contact = await Contact.findByPk(scheduleData.contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  const statusChanged =
    scheduleData.status !== undefined && scheduleData.status !== schedule.status;
  const nextStatus = scheduleData.status ?? schedule.status;

  let sentAt = schedule.sentAt;
  let canceledAt = schedule.canceledAt;

  if (statusChanged) {
    if (nextStatus === "sent") {
      sentAt = schedule.sentAt || new Date();
    }

    if (nextStatus === "canceled") {
      canceledAt = schedule.canceledAt || new Date();
    }

    if (nextStatus === "pending") {
      sentAt = null;
      canceledAt = null;
    }
  }

  let scheduledAt = schedule.scheduledAt;
  if (scheduleData.scheduledAt !== undefined) {
    const parsed = normalizeDate(scheduleData.scheduledAt);
    if (parsed === undefined) {
      throw new AppError("ERR_SCHEDULE_DATE_INVALID");
    }

    if (parsed === null) {
      throw new AppError("ERR_SCHEDULE_DATE_REQUIRED");
    }

    scheduledAt = parsed;
  }

  const normalizedSentAt = normalizeDate(scheduleData.sentAt);
  const normalizedCanceledAt = normalizeDate(scheduleData.canceledAt);

  await schedule.update({
    body: nextBody ?? schedule.body,
    status: nextStatus,
    scheduledAt,
    sentAt: normalizedSentAt !== undefined ? normalizedSentAt : sentAt,
    canceledAt: normalizedCanceledAt !== undefined ? normalizedCanceledAt : canceledAt,
    lastError:
      scheduleData.lastError !== undefined ? scheduleData.lastError : schedule.lastError,
    lastResult:
      scheduleData.lastResult !== undefined ? scheduleData.lastResult : schedule.lastResult,
    assigneeId:
      scheduleData.assigneeId !== undefined
        ? scheduleData.assigneeId
        : schedule.assigneeId,
    ticketId:
      scheduleData.ticketId !== undefined ? scheduleData.ticketId : schedule.ticketId,
    contactId:
      scheduleData.contactId !== undefined
        ? scheduleData.contactId
        : schedule.contactId
  });

  await schedule.reload();

  if (statusChanged) {
    await CreateScheduleLogService({
      scheduleId: schedule.id,
      status: schedule.status,
      message: `Status changed to ${schedule.status}`,
      executedAt: new Date()
    });
  }

  return schedule;
};

export default UpdateScheduleService;
