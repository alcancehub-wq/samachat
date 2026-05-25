import AppError from "../../errors/AppError";

const BRAZIL_SCHEDULE_OFFSET = "-03:00";
const DATETIME_LOCAL_MINUTES = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATETIME_LOCAL_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const DATETIME_LOCAL_MILLIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}$/;
const DATETIME_HAS_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

const withExplicitTimezone = (value: string): string => {
  const normalizedValue = value.trim();

  if (DATETIME_HAS_TIMEZONE.test(normalizedValue)) {
    return normalizedValue;
  }

  if (DATETIME_LOCAL_MINUTES.test(normalizedValue)) {
    return `${normalizedValue}:00${BRAZIL_SCHEDULE_OFFSET}`;
  }

  if (
    DATETIME_LOCAL_SECONDS.test(normalizedValue) ||
    DATETIME_LOCAL_MILLIS.test(normalizedValue)
  ) {
    return `${normalizedValue}${BRAZIL_SCHEDULE_OFFSET}`;
  }

  return normalizedValue;
};

export const parseScheduledAt = (value: Date | string): Date => {
  const parsedValue =
    value instanceof Date ? new Date(value.getTime()) : new Date(withExplicitTimezone(value));

  if (Number.isNaN(parsedValue.getTime())) {
    throw new AppError("ERR_SCHEDULE_DATE_INVALID");
  }

  return parsedValue;
};

export const assertScheduledAtIsFuture = (
  scheduledAt: Date,
  now = new Date()
): void => {
  if (scheduledAt.getTime() <= now.getTime()) {
    throw new AppError("ERR_SCHEDULE_DATE_MUST_BE_FUTURE");
  }
};

export default parseScheduledAt;