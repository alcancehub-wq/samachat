import { Op } from "sequelize";
import Schedule from "../../models/Schedule";
import CreateScheduleLogService from "./CreateScheduleLogService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { logger } from "../../utils/logger";

const DEFAULT_POLL_MS = 5000;
const DEFAULT_BATCH_SIZE = 20;

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

const executeSchedule = async (scheduleId: number): Promise<void> => {
  const schedule = await Schedule.findByPk(scheduleId);

  if (!schedule || schedule.status !== "processing") {
    return;
  }

  if (!schedule.ticketId) {
    await markFailed(schedule.id, "ERR_SCHEDULE_NO_TICKET");
    return;
  }

  try {
    const ticket = await ShowTicketService(schedule.ticketId);
    await SendWhatsAppMessage({ body: schedule.body, ticket });
    await markSent(schedule.id, "Schedule sent successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Schedule execution failed";
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

export default startScheduleWorker;
