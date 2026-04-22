import { Sequelize, WhereOptions, Op } from "sequelize";
import Campaign from "../../models/Campaign";
import Dialog from "../../models/Dialog";
import ContactList from "../../models/ContactList";

interface Request {
  searchParam?: string;
}

const ListCampaignsService = async ({
  searchParam = ""
}: Request): Promise<Campaign[]> => {
  const trimmedParam = searchParam.trim();

  const whereCondition: WhereOptions | undefined = trimmedParam
    ? {
        [Op.or]: [
          {
            name: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("Campaign.name")),
              "LIKE",
              `%${trimmedParam.toLowerCase()}%`
            )
          },
          {
            description: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("Campaign.description")),
              "LIKE",
              `%${trimmedParam.toLowerCase()}%`
            )
          }
        ]
      }
    : undefined;

  const campaigns = await Campaign.findAll({
    where: whereCondition,
    include: [
      {
        model: Dialog,
        attributes: ["id", "name"]
      },
      {
        model: ContactList,
        attributes: ["id", "name", "isDynamic"]
      }
    ],
    order: [["name", "ASC"]]
  });

  return campaigns;
};

export default ListCampaignsService;
