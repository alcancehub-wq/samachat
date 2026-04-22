import { FindOptions } from "sequelize";
import OpenAILog from "../../models/OpenAILog";

interface Request {
  limit?: number;
  ticketId?: number;
  contactId?: number;
  userId?: number;
}

const ListOpenAILogsService = async ({
  limit = 20,
  ticketId,
  contactId,
  userId
}: Request): Promise<OpenAILog[]> => {
  const where: FindOptions["where"] = {};

  if (ticketId) {
    where.ticketId = ticketId;
  }

  if (contactId) {
    where.contactId = contactId;
  }

  if (userId) {
    where.userId = userId;
  }

  const logs = await OpenAILog.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit
  });

  return logs;
};

export default ListOpenAILogsService;
