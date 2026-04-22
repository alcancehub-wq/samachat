import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";
import CreateScheduleLogService from "./CreateScheduleLogService";

interface Request {
  body: string;
  status?: string;
  scheduledAt: Date | string;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  createdById?: number | null;
}

const CreateScheduleService = async ({
  body,
  status = "pending",
  scheduledAt,
  assigneeId,
  ticketId,
  contactId,
  createdById
}: Request): Promise<Schedule> => {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    throw new AppError("ERR_SCHEDULE_BODY_REQUIRED");
  }

  if (!scheduledAt) {
    throw new AppError("ERR_SCHEDULE_DATE_REQUIRED");
  }

  const scheduledAtDate = new Date(scheduledAt);

  if (Number.isNaN(scheduledAtDate.getTime())) {
    throw new AppError("ERR_SCHEDULE_DATE_INVALID");
  }

  const duplicate = await Schedule.findOne({
    where: {
      status: "pending",
      scheduledAt: scheduledAtDate,
      body: trimmedBody,
      ticketId: ticketId || null,
      contactId: contactId || null
    }
  });

  if (duplicate) {
    throw new AppError("ERR_SCHEDULE_DUPLICATED");
  }

  if (assigneeId) {
    const assignee = await User.findByPk(assigneeId);
    if (!assignee) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }
  }

  if (ticketId) {
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
  }

  if (contactId) {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  let sentAt: Date | null = null;
  let canceledAt: Date | null = null;

  if (status === "sent") {
    sentAt = new Date();
  }

  if (status === "canceled") {
    canceledAt = new Date();
  }

  const schedule = await Schedule.create({
    body: trimmedBody,
    status,
    scheduledAt: scheduledAtDate,
    sentAt,
    canceledAt,
    assigneeId: assigneeId || null,
    ticketId: ticketId || null,
    contactId: contactId || null,
    createdById: createdById || null
  });

  await CreateScheduleLogService({
    scheduleId: schedule.id,
    status: schedule.status,
    message: "Schedule created",
    executedAt: new Date()
  });

  return schedule;
};

export default CreateScheduleService;
