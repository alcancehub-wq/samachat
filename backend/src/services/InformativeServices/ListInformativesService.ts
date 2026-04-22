import { Sequelize, WhereOptions, Op } from "sequelize";
import Informative from "../../models/Informative";
import ContactList from "../../models/ContactList";

interface Request {
  searchParam?: string;
  isActive?: boolean;
  audience?: string;
  contactListId?: number;
}

const ListInformativesService = async ({
  searchParam = "",
  isActive,
  audience,
  contactListId
}: Request): Promise<Informative[]> => {
  const trimmedParam = searchParam.trim();
  const whereCondition: WhereOptions = {};

  if (typeof isActive === "boolean") {
    Object.assign(whereCondition, { isActive });
  }

  if (audience) {
    Object.assign(whereCondition, { audience });
  }

  if (typeof contactListId === "number") {
    Object.assign(whereCondition, { contactListId });
  }

  if (trimmedParam) {
    Object.assign(whereCondition, {
      [Op.or]: [
        {
          title: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Informative.title")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        },
        {
          content: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Informative.content")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        }
      ]
    });
  }

  const informatives = await Informative.findAll({
    where: Object.keys(whereCondition).length ? whereCondition : undefined,
    include: [
      {
        model: ContactList,
        attributes: ["id", "name", "isActive", "isDynamic"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return informatives;
};

export default ListInformativesService;
