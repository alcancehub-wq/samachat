import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";

import ListTasksService from "../../services/TaskServices/ListTasksService";
import CreateTaskService from "../../services/TaskServices/CreateTaskService";
import ShowTaskService from "../../services/TaskServices/ShowTaskService";
import UpdateTaskService from "../../services/TaskServices/UpdateTaskService";
import DeleteTaskService from "../../services/TaskServices/DeleteTaskService";


type IndexQuery = {
  searchParam?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  ticketId?: string;
  contactId?: string;
};

interface TaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: string | null;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, status, priority, assigneeId, ticketId, contactId } =
    req.query as IndexQuery;

  const tasks = await ListTasksService({
    searchParam,
    status,
    priority,
    assigneeId: assigneeId ? Number(assigneeId) : undefined,
    ticketId: ticketId ? Number(ticketId) : undefined,
    contactId: contactId ? Number(contactId) : undefined
  });

  return res.json({
    data: tasks,
    meta: {
      count: tasks.length
    }
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newTask: TaskData = req.body;

  const schema = Yup.object().shape({
    title: Yup.string().required(),
    description: Yup.string(),
    status: Yup.string(),
    priority: Yup.string(),
    dueAt: Yup.string().nullable(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable()
  });

  try {
    await schema.validate(newTask);
  } catch (err) {
    throw new AppError(err.message);
  }

  const task = await CreateTaskService({
    ...newTask,
    createdById: Number(req.user.id)
  });

  const io = getIO();
  io.emit("task", {
    action: "create",
    task
  });

  return res.status(200).json({ data: task });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { taskId } = req.params;

  const task = await ShowTaskService(taskId);

  return res.status(200).json({ data: task });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const taskData: TaskData = req.body;

  const schema = Yup.object().shape({
    title: Yup.string(),
    description: Yup.string(),
    status: Yup.string(),
    priority: Yup.string(),
    dueAt: Yup.string().nullable(),
    assigneeId: Yup.number().nullable(),
    ticketId: Yup.number().nullable(),
    contactId: Yup.number().nullable()
  });

  try {
    await schema.validate(taskData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { taskId } = req.params;

  const task = await UpdateTaskService({
    taskId,
    taskData
  });

  const io = getIO();
  io.emit("task", {
    action: "update",
    task
  });

  return res.status(200).json({ data: task });
};

export const close = async (req: Request, res: Response): Promise<Response> => {
  const { taskId } = req.params;

  const task = await UpdateTaskService({
    taskId,
    taskData: { status: "completed" }
  });

  const io = getIO();
  io.emit("task", {
    action: "update",
    task
  });

  return res.status(200).json({ data: task });
};

export const reopen = async (req: Request, res: Response): Promise<Response> => {
  const { taskId } = req.params;

  const task = await UpdateTaskService({
    taskId,
    taskData: { status: "open" }
  });

  const io = getIO();
  io.emit("task", {
    action: "update",
    task
  });

  return res.status(200).json({ data: task });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { taskId } = req.params;

  await DeleteTaskService(taskId);

  const io = getIO();
  io.emit("task", {
    action: "delete",
    taskId
  });

  return res.status(200).json({
    data: {
      message: "Task deleted"
    }
  });
};
