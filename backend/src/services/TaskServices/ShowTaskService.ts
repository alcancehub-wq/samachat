import Task from "../../models/Task";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

const ShowTaskService = async (id: string | number): Promise<Task> => {
  const task = await Task.findByPk(id, {
    include: [
      {
        model: User,
        as: "assignee",
        attributes: ["id", "name"]
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["id", "name"]
      },
      {
        model: Ticket,
        attributes: ["id", "status", "lastMessage"]
      },
      {
        model: Contact,
        attributes: ["id", "name", "number"]
      }
    ]
  });

  if (!task) {
    throw new AppError("ERR_NO_TASK_FOUND", 404);
  }

  return task;
};

export default ShowTaskService;
