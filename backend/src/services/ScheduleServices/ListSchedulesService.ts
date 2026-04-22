import { Sequelize, WhereOptions, Op } from "sequelize";
import Schedule from "../../models/Schedule";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  status?: string;
  assigneeId?: number;
  ticketId?: number;
  contactId?: number;
  scheduledFrom?: Date | string;
  scheduledTo?: Date | string;
}

const toDate = (value?: Date | string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const ListSchedulesService = async ({
  searchParam = "",
  status,
  assigneeId,
  ticketId,
  contactId,
  scheduledFrom,
  scheduledTo
}: Request): Promise<Schedule[]> => {
  const trimmedParam = searchParam.trim();
  const whereCondition: WhereOptions = {};

  if (status) {
    Object.assign(whereCondition, { status });
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

  const parsedFrom = toDate(scheduledFrom);
  const parsedTo = toDate(scheduledTo);

  if (parsedFrom || parsedTo) {
    const range: { [key: symbol]: Date } = {};

    if (parsedFrom) {
      range[Op.gte] = parsedFrom;
    }

    if (parsedTo) {
      range[Op.lte] = parsedTo;
    }

    Object.assign(whereCondition, { scheduledAt: range });
  }

  if (trimmedParam) {
    Object.assign(whereCondition, {
      [Op.or]: [
        {
          body: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("body")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        }
      ]
    });
  }

  const schedules = await Schedule.findAll({
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
    order: [["scheduledAt", "DESC"]]
  });

  return schedules;
};

export default ListSchedulesService;
