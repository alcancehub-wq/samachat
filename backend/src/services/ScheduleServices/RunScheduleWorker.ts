import { Op } from "sequelize";
import Schedule from "../../models/Schedule";
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
const RETRYABLE_SCHEDULE_ERRORS = new Set(["ERR_WAPP_NOT_INITIALIZED"]);

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
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

const markSent = async (scheduleId: number, resultMessage: string): Promise<void> => {
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
    message: resultMessage,
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
    await releasePending(schedule.id, "Schedule is not due yet");
    return;
  }

  if (!schedule.ticketId) {
    await markFailed(schedule.id, "ERR_SCHEDULE_NO_TICKET");
    return;
  }

  try {
    const ticket = await ShowTicketService(schedule.ticketId);

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
      await markSent(schedule.id, "Schedule media sent successfully");
      return;
    }

    await SendWhatsAppMessage({ body: schedule.body, ticket });
    await markSent(schedule.id, "Schedule sent successfully");
  } catch (error) {
    const message = extractErrorMessage(error);

    if (isRetryableScheduleError(message)) {
      await releasePending(
        schedule.id,
        "Retrying schedule because WhatsApp session is not ready",
        message
      );
      return;
    }

    await markFailed(schedule.id, message);
  }
};

const runScheduleWorkerOnce = async (): Promise<void> => {
  const batchSize = parseNumber(process.env.SCHEDULE_BATCH_SIZE, DEFAULT_BATCH_SIZE);

  const schedules = await Schedule.findAll({
    where: {
      status: "pending",
      scheduledAt: {
        [Op.lte]: new Date()
      },
      sentAt: null,
      canceledAt: null
    },
    order: [["scheduledAt", "ASC"]],
    limit: batchSize
  });

  for (const schedule of schedules) {
    const claimed = await claimSchedule(schedule.id);
    if (!claimed) {
      continue;
    }

    await CreateScheduleLogService({
      scheduleId: schedule.id,
      status: "processing",
      message: "Schedule claimed for execution",
      executedAt: new Date()
    });

    await executeSchedule(schedule.id);
  }
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

export { executeSchedule, runScheduleWorkerOnce };

export default startScheduleWorker;
