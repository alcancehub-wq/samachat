import fs from "fs";
import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListSchedulesService from "../services/ScheduleServices/ListSchedulesService";
import CreateScheduleService from "../services/ScheduleServices/CreateScheduleService";
import ShowScheduleService from "../services/ScheduleServices/ShowScheduleService";
import UpdateScheduleService from "../services/ScheduleServices/UpdateScheduleService";
import DeleteScheduleService from "../services/ScheduleServices/DeleteScheduleService";

import AppError from "../errors/AppError";
import { ScheduleAccessData } from "../services/ScheduleServices/scheduleAccess";

type IndexQuery = {
  searchParam?: string;
  status?: string;
  assigneeId?: string;
  ticketId?: string;
  contactId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
};

interface ScheduleData {
  body?: string;
  status?: string;
  scheduledAt?: string | null;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  mediaFileName?: string | null;
  mediaOriginalName?: string | null;
  mediaMimeType?: string | null;
  removeMedia?: boolean;
}

const normalizeNullableNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return String(value);
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return undefined;
};

const getNormalizedScheduleData = (req: Request): ScheduleData => {
  const uploadedFile = req.file as Express.Multer.File | undefined;

  return {
    body: normalizeNullableString(req.body.body) || undefined,
    status: normalizeNullableString(req.body.status) || undefined,
    scheduledAt: normalizeNullableString(req.body.scheduledAt),
    assigneeId: normalizeNullableNumber(req.body.assigneeId),
    ticketId: normalizeNullableNumber(req.body.ticketId),
    contactId: normalizeNullableNumber(req.body.contactId),
    mediaFileName: uploadedFile?.filename,
    mediaOriginalName: uploadedFile?.originalname,
    mediaMimeType: uploadedFile?.mimetype,
    removeMedia: normalizeBoolean(req.body.removeMedia)
  };
};

const deleteUploadedFileIfExists = (file?: Express.Multer.File): void => {
  if (!file?.path) {
    return;
  }

  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
};

const getScheduleAccessData = (req: Request): ScheduleAccessData => ({
  userId: req.user.id,
  profile: req.user.profile
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    searchParam,
    status,
    assigneeId,
    ticketId,
    contactId,
    scheduledFrom,
    scheduledTo
  } = req.query as IndexQuery;

  const schedules = await ListSchedulesService({
    searchParam,
    status,
    assigneeId: assigneeId ? Number(assigneeId) : undefined,
    ticketId: ticketId ? Number(ticketId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    scheduledFrom,
    scheduledTo,
    accessData: getScheduleAccessData(req)
  });

  return res.json(schedules);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const newSchedule = getNormalizedScheduleData(req);

  const schema = Yup.object().shape({
    body: Yup.string().nullable(),
    status: Yup.string(),
    scheduledAt: Yup.string().required(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    mediaFileName: Yup.string().nullable(),
    mediaOriginalName: Yup.string().nullable(),
    mediaMimeType: Yup.string().nullable(),
    removeMedia: Yup.boolean()
  });

  try {
    await schema.validate(newSchedule);
  } catch (err) {
    deleteUploadedFileIfExists(uploadedFile);
    throw new AppError(err.message);
  }

  let schedule;

  try {
    schedule = await CreateScheduleService({
      ...newSchedule,
      scheduledAt: newSchedule.scheduledAt as string,
      createdById: Number(req.user.id),
      accessData: getScheduleAccessData(req)
    });
  } catch (error) {
    deleteUploadedFileIfExists(uploadedFile);
    throw error;
  }

  const io = getIO();
  io.emit("schedule", {
    action: "create",
    schedule
  });

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;

  const schedule = await ShowScheduleService(scheduleId, getScheduleAccessData(req));

  return res.status(200).json(schedule);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const uploadedFile = req.file as Express.Multer.File | undefined;
  const scheduleData = getNormalizedScheduleData(req);

  const schema = Yup.object().shape({
    body: Yup.string().nullable(),
    status: Yup.string(),
    scheduledAt: Yup.string().nullable(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable(),
    mediaFileName: Yup.string().nullable(),
    mediaOriginalName: Yup.string().nullable(),
    mediaMimeType: Yup.string().nullable(),
    removeMedia: Yup.boolean()
  });

  try {
    await schema.validate(scheduleData);
  } catch (err) {
    deleteUploadedFileIfExists(uploadedFile);
    throw new AppError(err.message);
  }

  const { scheduleId } = req.params;

  let schedule;

  try {
    schedule = await UpdateScheduleService({
      scheduleId,
      scheduleData,
      accessData: getScheduleAccessData(req)
    });
  } catch (error) {
    deleteUploadedFileIfExists(uploadedFile);
    throw error;
  }

  const io = getIO();
  io.emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const cancel = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;

  const schedule = await UpdateScheduleService({
    scheduleId,
    scheduleData: { status: "canceled" },
    accessData: getScheduleAccessData(req)
  });

  const io = getIO();
  io.emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const reopen = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;

  const schedule = await UpdateScheduleService({
    scheduleId,
    scheduleData: { status: "pending" },
    accessData: getScheduleAccessData(req)
  });

  const io = getIO();
  io.emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;

  await DeleteScheduleService(scheduleId, getScheduleAccessData(req));

  const io = getIO();
  io.emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};
