import Schedule from "../../models/Schedule";
import ScheduleLog from "../../models/ScheduleLog";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { ScheduleAccessData, assertScheduleAccess } from "./scheduleAccess";

const ShowScheduleService = async (
  id: string | number,
  accessData?: ScheduleAccessData
): Promise<Schedule> => {
  const schedule = await Schedule.findByPk(id, {
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
        attributes: ["id", "status", "lastMessage", "userId", "queueId", "whatsappId"]
      },
      {
        model: Contact,
        attributes: ["id", "name", "number"]
      },
      {
        model: ScheduleLog,
        separate: true,
        order: [["createdAt", "DESC"]]
      }
    ]
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  await assertScheduleAccess(schedule as Schedule & { ticket?: Ticket | null }, accessData);

  return schedule;
};

export default ShowScheduleService;
