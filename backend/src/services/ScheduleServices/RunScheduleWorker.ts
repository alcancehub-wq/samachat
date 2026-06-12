import { Op } from "sequelize";
import Schedule from "../../models/Schedule";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import CreateScheduleLogService from "./CreateScheduleLogService";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { logger } from "../../utils/logger";
import { ERR_SCHEDULE_TICKET_CLOSED, isClosedScheduleTicket } from "./assertScheduleTicketIsActive";
import { parseScheduledAt } from "./normalizeScheduledAt";
import { buildScheduledMediaFile } from "./scheduleMedia";

const DEFAULT_POLL_MS = 5000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_WAPP_UNAVAILABLE_COOLDOWN_MS = 60000;
const RETRYABLE_SCHEDULE_ERRORS = new Set(["ERR_WAPP_NOT_INITIALIZED"]);
const whatsappCooldownUntil = new Map<number, number>();

type ScheduleWithTicket = Schedule & {
  ticket?: Pick<Ticket, "id" | "whatsappId"> | null;
};

const toISOStringOrNull = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

const buildScheduleAuditMessage = (
  event: string,
  schedule: Pick<
    Schedule,
    | "id"
    | "scheduledAt"
    | "ticketId"
    | "contactId"
    | "assigneeId"
    | "status"
    | "mediaFileName"
    | "mediaMimeType"
  >,
  extra: Record<string, unknown> = {}
): string =>
  JSON.stringify({
    event,
    scheduleId: schedule.id,
    status: schedule.status,
    scheduledAt: toISOStringOrNull(schedule.scheduledAt),
    workerNow: new Date().toISOString(),
    ticketId: schedule.ticketId || null,
    contactId: schedule.contactId || null,
    assigneeId: schedule.assigneeId || null,
    hasMedia: Boolean(schedule.mediaFileName),
    mediaMimeType: schedule.mediaMimeType || null,
    ...extra
  });

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getWhatsappUnavailableCooldownMs = (): number =>
  parseNumber(
    process.env.SCHEDULE_WAPP_UNAVAILABLE_COOLDOWN_MS,
    DEFAULT_WAPP_UNAVAILABLE_COOLDOWN_MS
  );

const clearExpiredWhatsappCooldowns = (now = Date.now()): void => {
  for (const [whatsappId, cooldownUntil] of whatsappCooldownUntil.entries()) {
    if (cooldownUntil <= now) {
      whatsappCooldownUntil.delete(whatsappId);
    }
  }
};

const setWhatsappCooldown = (whatsappId: number, durationMs: number): void => {
  if (!Number.isFinite(whatsappId)) {
    return;
  }

  whatsappCooldownUntil.set(whatsappId, Date.now() + durationMs);
};

const getScheduleWhatsappId = (schedule: ScheduleWithTicket): number | null => {
  const whatsappId = schedule.ticket?.whatsappId;

  if (typeof whatsappId !== "number" || Number.isNaN(whatsappId)) {
    return null;
  }

  return whatsappId;
};

const isWhatsappCooldownActive = (whatsappId: number, now = Date.now()): boolean => {
  const cooldownUntil = whatsappCooldownUntil.get(whatsappId);

  if (!cooldownUntil) {
    return false;
  }

  if (cooldownUntil <= now) {
    whatsappCooldownUntil.delete(whatsappId);
    return false;
  }

  return true;
};

const claimSchedule = async (scheduleId: number): Promise<boolean> => {
  const [updated] = await Schedule.update(
    { status: "processing" },
    {
      where: {
        id: scheduleId,
        status: "pending"
      }
    }
  );

  return updated > 0;
};

const markFailed = async (scheduleId: number, errorMessage: string): Promise<void> => {
  await Schedule.update(
    {
      status: "failed",
      lastError: errorMessage
    },
    { where: { id: scheduleId } }
  );

  await CreateScheduleLogService({
    scheduleId,
    status: "failed",
    error: errorMessage,
    executedAt: new Date()
  });
};

const markSent = async (
  scheduleId: number,
  resultMessage: string,
  auditMessage?: string
): Promise<void> => {
  await Schedule.update(
    {
      status: "sent",
      sentAt: new Date(),
      lastResult: resultMessage,
      lastError: null
    },
    { where: { id: scheduleId } }
  );

  await CreateScheduleLogService({
    scheduleId,
    status: "sent",
    message: auditMessage || resultMessage,
    executedAt: new Date()
  });
};

const releasePending = async (
  scheduleId: number,
  message: string,
  errorMessage?: string
): Promise<void> => {
  await Schedule.update(
    {
      status: "pending",
      lastError: errorMessage || null,
      lastResult: null
    },
    {
      where: {
        id: scheduleId,
        status: "processing"
      }
    }
  );

  await CreateScheduleLogService({
    scheduleId,
    status: "pending",
    message,
    error: errorMessage,
    executedAt: new Date()
  });
};

const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return "Schedule execution failed";
};


const applyScheduleCreatorContextToTicket = async (
  schedule: Schedule,
  ticket: Ticket
): Promise<Ticket> => {
  if (!schedule.createdById) {
    return ticket;
  }

  const scheduleCreator = await User.findByPk(schedule.createdById, {
    attributes: ["id", "name", "email", "whatsappId"],
    include: ["whatsapp"]
  });

  if (!scheduleCreator) {
    return ticket;
  }

  const senderWhatsappId =
    schedule.senderWhatsappId ||
    scheduleCreator.whatsappId ||
    scheduleCreator.whatsapp?.id ||
    null;

  ticket.user = scheduleCreator;
  ticket.setDataValue("user", scheduleCreator);

  if (senderWhatsappId) {
    ticket.whatsappId = senderWhatsappId;
    ticket.setDataValue("whatsappId", senderWhatsappId);
  }

  return ticket;
};

const isRetryableScheduleError = (errorMessage: string): boolean => {
  if (RETRYABLE_SCHEDULE_ERRORS.has(errorMessage)) {
    return true;
  }

  return /session\s+not\s+ready|provider\s+not\s+ready|connecting\s+timeout/i.test(
    errorMessage
  );
};

const executeSchedule = async (scheduleId: number): Promise<void> => {
  const schedule = await Schedule.findByPk(scheduleId);

  if (!schedule || schedule.status !== "processing") {
    return;
  }

  let scheduledAt: Date;

  try {
    scheduledAt = parseScheduledAt(schedule.scheduledAt);
  } catch (error) {
    await markFailed(schedule.id, "ERR_SCHEDULE_DATE_INVALID");
    return;
  }

  if (scheduledAt.getTime() > Date.now()) {
    await releasePending(
      schedule.id,
      buildScheduleAuditMessage("schedule_not_due_yet", schedule, {
        parsedScheduledAt: scheduledAt.toISOString()
      })
    );
    return;
  }

  if (!schedule.ticketId) {
    await markFailed(schedule.id, "ERR_SCHEDULE_NO_TICKET");
    return;
  }

  try {
    const ticket = await applyScheduleCreatorContextToTicket(
      schedule,
      await ShowTicketService(schedule.ticketId)
    );

    if (isClosedScheduleTicket(ticket)) {
      logger.warn(
        {
          scheduleId: schedule.id,
          ticketId: schedule.ticketId,
          ticketStatus: ticket.status
        },
        "Blocked schedule execution for closed ticket"
      );
      await markFailed(schedule.id, ERR_SCHEDULE_TICKET_CLOSED);
      return;
    }

    const scheduledMedia = buildScheduledMediaFile(schedule);

    if (scheduledMedia) {
      const hasBody = Boolean(schedule.body?.trim());
      const isAudioSchedule = (schedule.mediaMimeType || scheduledMedia.mimetype || "")
        .toLowerCase()
        .startsWith("audio/");

      if (hasBody && isAudioSchedule) {
        await SendWhatsAppMessage({ body: schedule.body, ticket });
      }

      await SendWhatsAppMedia({
        media: scheduledMedia,
        ticket,
        body: hasBody && !isAudioSchedule ? schedule.body : undefined,
        forceSendAudioAsVoice: isAudioSchedule ? false : undefined
      });
      await markSent(
        schedule.id,
        "Schedule media sent successfully",
        buildScheduleAuditMessage("schedule_media_sent", schedule, {
          ticketId: ticket.id,
          whatsappId: ticket.whatsappId || null
        })
      );
      return;
    }

    await SendWhatsAppMessage({ body: schedule.body, ticket });
    await markSent(
      schedule.id,
      "Schedule sent successfully",
      buildScheduleAuditMessage("schedule_message_sent", schedule, {
        ticketId: ticket.id,
        whatsappId: ticket.whatsappId || null
      })
    );
  } catch (error) {
    const message = extractErrorMessage(error);

    if (isRetryableScheduleError(message)) {
      try {
        const ticket = await ShowTicketService(schedule.ticketId);
        if (typeof ticket.whatsappId === "number") {
          setWhatsappCooldown(ticket.whatsappId, getWhatsappUnavailableCooldownMs());
        }
      } catch (ticketError) {
        logger.warn(
          {
            scheduleId: schedule.id,
            ticketId: schedule.ticketId,
            error: extractErrorMessage(ticketError)
          },
          "Failed to inspect ticket while throttling unavailable WhatsApp schedule"
        );
      }

      await releasePending(
        schedule.id,
        buildScheduleAuditMessage("schedule_retry_whatsapp_unavailable", schedule, {
          error: message
        }),
        message
      );
      return;
    }

    await markFailed(schedule.id, message);
  }
};

const runScheduleWorkerOnce = async (): Promise<void> => {
  const batchSize = parseNumber(process.env.SCHEDULE_BATCH_SIZE, DEFAULT_BATCH_SIZE);
  const now = Date.now();
  const handledWhatsappIds = new Set<number>();

  clearExpiredWhatsappCooldowns(now);

  const schedules = (await Schedule.findAll({
    where: {
      status: "pending",
      scheduledAt: {
        [Op.lte]: new Date()
      },
      sentAt: null,
      canceledAt: null
    },
    include: [
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id", "whatsappId"],
        required: false
      }
    ],
    order: [["scheduledAt", "ASC"]],
    limit: batchSize
  })) as ScheduleWithTicket[];

  for (const schedule of schedules) {
    const whatsappId = getScheduleWhatsappId(schedule);

    if (whatsappId !== null) {
      if (handledWhatsappIds.has(whatsappId)) {
        continue;
      }

      if (isWhatsappCooldownActive(whatsappId, now)) {
        continue;
      }
    }

    const claimed = await claimSchedule(schedule.id);
    if (!claimed) {
      continue;
    }

    if (whatsappId !== null) {
      handledWhatsappIds.add(whatsappId);
    }

    await CreateScheduleLogService({
      scheduleId: schedule.id,
      status: "processing",
      message: buildScheduleAuditMessage("schedule_claimed_for_execution", schedule, {
        whatsappId
      }),
      executedAt: new Date()
    });

    await executeSchedule(schedule.id);
  }
};

const resetScheduleWorkerState = (): void => {
  whatsappCooldownUntil.clear();
};

const startScheduleWorker = (): void => {
  const pollMs = parseNumber(process.env.SCHEDULE_POLL_MS, DEFAULT_POLL_MS);
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }

    running = true;

    try {
      await runScheduleWorkerOnce();
    } catch (error) {
      logger.error({ info: "Schedule worker failed", error });
    } finally {
      running = false;
    }
  };

  void tick();
  setInterval(tick, pollMs);
};

export { executeSchedule, runScheduleWorkerOnce, resetScheduleWorkerState };

export default startScheduleWorker;
