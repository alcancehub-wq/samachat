import AppError from "../../errors/AppError";
import { parseScheduledAt } from "../ScheduleServices/normalizeScheduledAt";

export const parseCampaignScheduledAt = (value: Date | string): Date => {
  try {
    return parseScheduledAt(value);
  } catch (error) {
    throw new AppError("ERR_CAMPAIGN_SCHEDULE_INVALID");
  }
};

export const assertCampaignScheduledAtIsFuture = (
  scheduledAt: Date,
  now = new Date()
): void => {
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new AppError("ERR_CAMPAIGN_SCHEDULE_MUST_BE_FUTURE");
  }
};
