import { Sequelize, Op } from "sequelize";
import Contact from "../../models/Contact";
import Tag from "../../models/Tag";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  tagIds?: number[];
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  tagIds = []
}: Request): Promise<Response> => {
  const whereCondition = {
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("Contact.name")),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      },
      { number: { [Op.like]: `%${searchParam.toLowerCase().trim()}%` } }
    ]
  };
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const includeTags = {
    model: Tag,
    as: "tags",
    attributes: ["id", "name", "color"],
    through: { attributes: [] },
    required: tagIds.length > 0,
    where: tagIds.length > 0 ? { id: { [Op.in]: tagIds } } : undefined
  };

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    include: [includeTags],
    distinct: true,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  return {
    contacts,
    count,
    hasMore
  };
};

export default ListContactsService;
