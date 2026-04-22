import { Sequelize, WhereOptions, Op } from "sequelize";
import Webhook from "../../models/Webhook";
import Integration from "../../models/Integration";

interface Request {
  searchParam?: string;
  integrationId?: string;
}

const ListWebhooksService = async ({
  searchParam = "",
  integrationId
}: Request): Promise<Webhook[]> => {
  const trimmedParam = searchParam.trim();

  const whereCondition: WhereOptions = {};

  if (trimmedParam) {
    Object.assign(whereCondition, {
      [Op.or]: [
        {
          name: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Webhook.name")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        },
        {
          url: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Webhook.url")),
            "LIKE",
            `%${trimmedParam.toLowerCase()}%`
          )
        }
      ]
    });
  }

  if (integrationId) {
    Object.assign(whereCondition, { integrationId });
  }

  const webhooks = await Webhook.findAll({
    where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
    include: [
      {
        model: Integration,
        attributes: ["id", "name", "type"]
      }
    ],
    order: [["name", "ASC"]]
  });

  return webhooks;
};

export default ListWebhooksService;
