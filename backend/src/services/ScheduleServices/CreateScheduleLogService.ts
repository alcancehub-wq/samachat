import ScheduleLog from "../../models/ScheduleLog";
import { sanitizeOutboundAuditText } from "../../utils/sanitizeOutboundAudit";

interface Request {
  scheduleId: number;
  status: string;
  message?: string;
  error?: string;
  executedAt?: Date | string | null;
}

const CreateScheduleLogService = async ({
  scheduleId,
  status,
  message,
  error,
  executedAt
}: Request): Promise<ScheduleLog> => {
  let executedAtValue: Date | null = null;

  if (executedAt) {
    const parsed = new Date(executedAt);
    executedAtValue = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const log = await ScheduleLog.create({
    scheduleId,
    status,
    message: sanitizeOutboundAuditText(message),
    error: sanitizeOutboundAuditText(error),
    executedAt: executedAtValue
  });

  return log;
};

export default CreateScheduleLogService;
