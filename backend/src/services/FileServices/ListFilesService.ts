import { Op, Sequelize, WhereOptions } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

interface Request {
  searchParam?: string;
  mediaType?: string;
  ticketId?: number;
  contactId?: number;
  dateFrom?: string;
  dateTo?: string;
}

const ListFilesService = async ({
  searchParam = "",
  mediaType,
  ticketId,
  contactId,
  dateFrom,
  dateTo
}: Request): Promise<Message[]> => {
  const whereCondition: WhereOptions = {
    mediaUrl: { [Op.not]: null } as any
  };

  if (mediaType) {
    const normalizedType = mediaType.trim().toLowerCase();
    Object.assign(whereCondition, {
      mediaType: Sequelize.where(
        Sequelize.fn("LOWER", Sequelize.col("mediaType")),
        "LIKE",
        `${normalizedType}%`
      )
    });
  }

  if (typeof ticketId === "number") {
    Object.assign(whereCondition, { ticketId });
  }

  if (typeof contactId === "number") {
    Object.assign(whereCondition, { contactId });
  }

  if (dateFrom || dateTo) {
    Object.assign(whereCondition, {
      createdAt: {
        ...(dateFrom ? { [Op.gte]: new Date(dateFrom) } : {}),
        ...(dateTo ? { [Op.lte]: new Date(dateTo) } : {})
      }
    });
  }

  if (searchParam) {
    const trimmed = searchParam.trim().toLowerCase();
    Object.assign(whereCondition, {
      [Op.or]: [
        {
          body: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("body")),
            "LIKE",
            `%${trimmed}%`
          )
        },
        {
          mediaUrl: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("mediaUrl")),
            "LIKE",
            `%${trimmed}%`
          )
        }
      ]
    });
  }

  const files = await Message.findAll({
    where: whereCondition,
    include: [
      {
        model: Ticket,
        attributes: ["id", "status"]
      },
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: 500
  });

  return files;
};

export default ListFilesService;
