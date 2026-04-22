import AppError from "../../errors/AppError";
import Task from "../../models/Task";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface TaskData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: Date | string | null;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
}

interface Request {
  taskId: string;
  taskData: TaskData;
}

const UpdateTaskService = async ({ taskId, taskData }: Request): Promise<Task> => {
  const task = await Task.findByPk(taskId);

  if (!task) {
    throw new AppError("ERR_NO_TASK_FOUND", 404);
  }

  const nextTitle = taskData.title ? taskData.title.trim() : undefined;

  if (taskData.assigneeId) {
    const assignee = await User.findByPk(taskData.assigneeId);
    if (!assignee) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }
  }

  if (taskData.ticketId) {
    const ticket = await Ticket.findByPk(taskData.ticketId);
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
  }

  if (taskData.contactId) {
    const contact = await Contact.findByPk(taskData.contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  await task.update({
    title: nextTitle ?? task.title,
    description: taskData.description ?? task.description,
    status: taskData.status ?? task.status,
    priority: taskData.priority ?? task.priority,
    dueAt: taskData.dueAt !== undefined ? taskData.dueAt || null : task.dueAt,
    assigneeId:
      taskData.assigneeId !== undefined ? taskData.assigneeId : task.assigneeId,
    ticketId:
      taskData.ticketId !== undefined ? taskData.ticketId : task.ticketId,
    contactId:
      taskData.contactId !== undefined ? taskData.contactId : task.contactId
  });

  await task.reload();

  return task;
};

export default UpdateTaskService;
