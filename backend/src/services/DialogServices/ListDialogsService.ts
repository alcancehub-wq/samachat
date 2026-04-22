import { Sequelize, WhereOptions, Op } from "sequelize";
import Dialog from "../../models/Dialog";

interface Request {
  searchParam?: string;
}

const ListDialogsService = async ({
  searchParam = ""
}: Request): Promise<Dialog[]> => {
  const trimmedParam = searchParam.trim();

  const whereCondition: WhereOptions | undefined = trimmedParam
    ? {
        [Op.or]: [
          {
            name: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("name")),
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
          },
          {
            content: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("content")),
              "LIKE",
              `%${trimmedParam.toLowerCase()}%`
            )
          }
        ]
      }
    : undefined;

  const dialogs = await Dialog.findAll({
    where: whereCondition,
    order: [["name", "ASC"]]
  });

  return dialogs;
};

export default ListDialogsService;
