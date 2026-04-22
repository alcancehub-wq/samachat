import { Sequelize, WhereOptions, Op } from "sequelize";
import Task from "../../models/Task";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  status?: string;
  priority?: string;
  assigneeId?: number;
  ticketId?: number;
  contactId?: number;
}

const ListTasksService = async ({
  searchParam = "",
  status,
  priority,
  assigneeId,
  ticketId,
  contactId
}: Request): Promise<Task[]> => {
  const trimmedParam = searchParam.trim();
  const whereCondition: WhereOptions = {};

  if (status) {
    Object.assign(whereCondition, { status });
  }

  if (priority) {
    Object.assign(whereCondition, { priority });
  }

  if (typeof assigneeId === "number") {
    Object.assign(whereCondition, { assigneeId });
  }

  if (typeof ticketId === "number") {
    Object.assign(whereCondition, { ticketId });
  }

  if (typeof contactId === "number") {
    Object.assign(whereCondition, { contactId });
  }

  if (trimmedParam) {
    Object.assign(whereCondition, {
      [Op.or]: [
        {
          title: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("title")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        },
        {
          description: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("description")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        }
      ]
    });
  }

  const tasks = await Task.findAll({
    where: Object.keys(whereCondition).length ? whereCondition : undefined,
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
    ],
    order: [["updatedAt", "DESC"]]
  });

  return tasks;
};

export default ListTasksService;
