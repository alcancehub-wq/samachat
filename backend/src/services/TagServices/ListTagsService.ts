import { Sequelize, WhereOptions } from "sequelize";
import Tag from "../../models/Tag";

interface Request {
  searchParam?: string;
}

const ListTagsService = async ({ searchParam = "" }: Request): Promise<Tag[]> => {
  const whereCondition: WhereOptions | undefined = searchParam
    ? {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      }
    : undefined;

  const tags = await Tag.findAll({
    where: whereCondition,
    order: [["name", "ASC"]]
  });

  return tags;
};

export default ListTagsService;
