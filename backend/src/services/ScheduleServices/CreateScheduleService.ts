import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";
import CreateScheduleLogService from "./CreateScheduleLogService";
import assertScheduleTicketIsActive from "./assertScheduleTicketIsActive";
import { ScheduleAccessData, loadScheduleTicketForAccess } from "./scheduleAccess";
import {
  assertScheduledAtIsFuture,
  parseScheduledAt
} from "./normalizeScheduledAt";

interface Request {
  body?: string;
  status?: string;
  scheduledAt: Date | string;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  createdById?: number | null;
  senderWhatsappId?: number | null;
  mediaFileName?: string | null;
  mediaOriginalName?: string | null;
  mediaMimeType?: string | null;
  accessData?: ScheduleAccessData;
}

const CreateScheduleService = async ({
  body = "",
  status = "pending",
  scheduledAt,
  assigneeId,
  ticketId,
  contactId,
  createdById,
  senderWhatsappId,
  mediaFileName = null,
  mediaOriginalName = null,
  mediaMimeType = null,
  accessData
}: Request): Promise<Schedule> => {
  const trimmedBody = body.trim();

  if (!trimmedBody && !mediaFileName) {
    throw new AppError("ERR_SCHEDULE_BODY_OR_MEDIA_REQUIRED");
  }

  if (!scheduledAt) {
    throw new AppError("ERR_SCHEDULE_DATE_REQUIRED");
  }

  const scheduledAtDate = parseScheduledAt(scheduledAt);

  const duplicate = await Schedule.findOne({
    where: {
      status: "pending",
      scheduledAt: scheduledAtDate,
      body: trimmedBody,
      ticketId: ticketId || null,
      contactId: contactId || null,
      mediaOriginalName: mediaOriginalName || null
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

  let resolvedSenderWhatsappId = senderWhatsappId || null;

  if (ticketId !== undefined || accessData) {
    const ticket = await loadScheduleTicketForAccess(ticketId, accessData);

    assertScheduleTicketIsActive(ticket);

    if (!resolvedSenderWhatsappId && ticket?.whatsappId) {
      resolvedSenderWhatsappId = ticket.whatsappId;
    }
  }

  if (contactId) {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  assertScheduledAtIsFuture(scheduledAtDate);

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
    mediaFileName,
    mediaOriginalName,
    mediaMimeType,
    assigneeId: assigneeId || null,
    ticketId: ticketId || null,
    contactId: contactId || null,
    createdById: createdById || null,
    senderWhatsappId: resolvedSenderWhatsappId
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
