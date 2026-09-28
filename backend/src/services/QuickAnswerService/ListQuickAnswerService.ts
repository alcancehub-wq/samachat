import { Op, Sequelize } from "sequelize";
import QuickAnswer from "../../models/QuickAnswer";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  searchField?: "message" | "shortcut";
  userId: number;
}

interface Response {
  quickAnswers: QuickAnswer[];
  count: number;
  hasMore: boolean;
}

const ListQuickAnswerService = async ({
  searchParam = "",
  pageNumber = "1",
  searchField = "message",
  userId
}: Request): Promise<Response> => {
  const searchColumn = searchField === "shortcut" ? "shortcut" : "message";

  const whereCondition = {
    [Op.and]: [
      {
        [Op.or]: [{ userId }, { userId: null }]
      },
      {
        [searchColumn]: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col(searchColumn)),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      }
    ]
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: quickAnswers } = await QuickAnswer.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["message", "ASC"]]
  });

  const hasMore = count > offset + quickAnswers.length;

  return { quickAnswers, count, hasMore };
};

export default ListQuickAnswerService;
