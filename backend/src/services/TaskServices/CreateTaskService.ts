import AppError from "../../errors/AppError";
import Task from "../../models/Task";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueAt?: Date | string | null;
  assigneeId?: number | null;
  ticketId?: number | null;
  contactId?: number | null;
  createdById?: number | null;
}

const CreateTaskService = async ({
  title,
  description,
  status = "open",
  priority = "medium",
  dueAt,
  assigneeId,
  ticketId,
  contactId,
  createdById
}: Request): Promise<Task> => {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new AppError("ERR_TASK_TITLE_REQUIRED");
  }

  if (assigneeId) {
    const assignee = await User.findByPk(assigneeId);
    if (!assignee) {
      throw new AppError("ERR_NO_USER_FOUND", 404);
    }
  }

  if (ticketId) {
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }
  }

  if (contactId) {
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }
  }

  const task = await Task.create({
    title: trimmedTitle,
    description,
    status,
    priority,
    dueAt: dueAt || null,
    assigneeId: assigneeId || null,
    ticketId: ticketId || null,
    contactId: contactId || null,
    createdById: createdById || null
  });

  return task;
};

export default CreateTaskService;
