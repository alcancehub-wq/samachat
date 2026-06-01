import fs from "fs";
import path from "path";
import uploadConfig from "../../config/upload";
import AppError from "../../errors/AppError";

type ScheduleMediaRecord = {
  mediaFileName?: string | null;
  mediaOriginalName?: string | null;
  mediaMimeType?: string | null;
};

export const resolveScheduleMediaPath = (fileName: string): string =>
  path.join(uploadConfig.directory, fileName);

export const deleteScheduleMediaFileIfExists = (
  fileName?: string | null
): void => {
  if (!fileName) {
    return;
  }

  const filePath = resolveScheduleMediaPath(fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const buildScheduledMediaFile = (
  schedule: ScheduleMediaRecord
): Express.Multer.File | null => {
  if (!schedule.mediaFileName) {
    return null;
  }

  const filePath = resolveScheduleMediaPath(schedule.mediaFileName);

  if (!fs.existsSync(filePath)) {
    throw new AppError("ERR_SCHEDULE_MEDIA_NOT_FOUND", 404);
  }

  const stats = fs.statSync(filePath);

  return {
    fieldname: "media",
    originalname: schedule.mediaOriginalName || schedule.mediaFileName,
    encoding: "7bit",
    mimetype: schedule.mediaMimeType || "application/octet-stream",
    destination: uploadConfig.directory,
    filename: schedule.mediaFileName,
    path: filePath,
    size: stats.size
  } as Express.Multer.File;
};