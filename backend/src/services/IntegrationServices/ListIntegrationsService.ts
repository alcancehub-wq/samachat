import { Sequelize, WhereOptions, Op } from "sequelize";
import Integration from "../../models/Integration";

interface Request {
  searchParam?: string;
}

const ListIntegrationsService = async ({
  searchParam = ""
}: Request): Promise<Integration[]> => {
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
            type: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("type")),
              "LIKE",
              `%${trimmedParam.toLowerCase()}%`
            )
          }
        ]
      }
    : undefined;

  const integrations = await Integration.findAll({
    where: whereCondition,
    order: [["name", "ASC"]]
  });

  return integrations;
};

export default ListIntegrationsService;
