import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListSchedulesService from "../services/ScheduleServices/ListSchedulesService";
import CreateScheduleService from "../services/ScheduleServices/CreateScheduleService";
import ShowScheduleService from "../services/ScheduleServices/ShowScheduleService";
import UpdateScheduleService from "../services/ScheduleServices/UpdateScheduleService";
import DeleteScheduleService from "../services/ScheduleServices/DeleteScheduleService";

import AppError from "../errors/AppError";

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
}

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
    scheduledTo
  });

  return res.json(schedules);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newSchedule: ScheduleData = req.body;

  const schema = Yup.object().shape({
    body: Yup.string().required(),
    status: Yup.string(),
    scheduledAt: Yup.string().required(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable()
  });

  try {
    await schema.validate(newSchedule);
  } catch (err) {
    throw new AppError(err.message);
  }

  const schedule = await CreateScheduleService({
    ...newSchedule,
    body: newSchedule.body as string,
    scheduledAt: newSchedule.scheduledAt as string,
    createdById: Number(req.user.id)
  });

  const io = getIO();
  io.emit("schedule", {
    action: "create",
    schedule
  });

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;

  const schedule = await ShowScheduleService(scheduleId);

  return res.status(200).json(schedule);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const scheduleData: ScheduleData = req.body;

  const schema = Yup.object().shape({
    body: Yup.string(),
    status: Yup.string(),
    scheduledAt: Yup.string().nullable(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable()
  });

  try {
    await schema.validate(scheduleData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { scheduleId } = req.params;

  const schedule = await UpdateScheduleService({
    scheduleId,
    scheduleData
  });

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
    scheduleData: { status: "canceled" }
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
    scheduleData: { status: "pending" }
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

  await DeleteScheduleService(scheduleId);

  const io = getIO();
  io.emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};
