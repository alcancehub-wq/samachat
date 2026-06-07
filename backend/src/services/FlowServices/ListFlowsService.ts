import { Sequelize, WhereOptions, Op } from "sequelize";
import Flow from "../../models/Flow";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  searchParam?: string;
  status?: string;
  isActive?: boolean;
}

const ListFlowsService = async ({
  searchParam = "",
  status,
  isActive
}: Request): Promise<Flow[]> => {
  const trimmedParam = searchParam.trim();
  const whereCondition: WhereOptions = {};

  if (status) {
    Object.assign(whereCondition, { status });
  }

  if (typeof isActive === "boolean") {
    Object.assign(whereCondition, { isActive });
  }

  if (trimmedParam) {
    Object.assign(whereCondition, {
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
        }
      ]
    });
  }

  const flows = await Flow.findAll({
    where: Object.keys(whereCondition).length ? whereCondition : undefined,
    include: [
      {
        model: Whatsapp,
        attributes: ["id", "name", "phoneNumber"],
        include: [
          {
            association: "users",
            attributes: ["id", "name"]
          }
        ]
      }
    ],
    order: [["updatedAt", "DESC"]]
  });

  return flows;
};

export default ListFlowsService;
