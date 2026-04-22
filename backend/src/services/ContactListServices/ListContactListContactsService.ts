import { Op, Sequelize } from "sequelize";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactListContact from "../../models/ContactListContact";
import Tag from "../../models/Tag";
import ShowContactListService from "./ShowContactListService";
import {
  applyContactListFilters,
  parseContactListFilters
} from "./contactListFilters";

interface Request {
  listId: string | number;
  pageNumber?: string;
  searchParam?: string;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactListContactsService = async ({
  listId,
  pageNumber = "1",
  searchParam = ""
}: Request): Promise<Response> => {
  const list = await ShowContactListService(listId);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  if (!list.isDynamic) {
    const { count, rows } = await ContactListContact.findAndCountAll({
      where: { contactListId: list.id },
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "email", "profilePicUrl"],
          include: ["tags", "extraInfo"]
        }
      ],
      order: [[{ model: Contact, as: "contact" }, "name", "ASC"]],
      limit,
      offset
    });

    const contacts = rows.map(row => row.contact).filter(Boolean);
    const hasMore = count > offset + contacts.length;

    return {
      contacts,
      count,
      hasMore
    };
  }

  const filters = parseContactListFilters(list.filters);

  const whereCondition = {
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          "LIKE",
          `%${searchParam.toLowerCase().trim()}%`
        )
      },
      { number: { [Op.like]: `%${searchParam.toLowerCase().trim()}%` } }
    ]
  };

  const includeTags = {
    model: Tag,
    as: "tags",
    attributes: ["id", "name", "color"],
    through: { attributes: [] },
    required: filters.tagIds && filters.tagIds.length > 0,
    where: filters.tagIds && filters.tagIds.length > 0
      ? { id: { [Op.in]: filters.tagIds } }
      : undefined
  };

  const contacts = await Contact.findAll({
    where: whereCondition,
    include: [
      includeTags,
      {
        model: ContactCustomField,
        as: "extraInfo"
      }
    ],
    order: [["name", "ASC"]]
  });

  const filteredContacts = applyContactListFilters(contacts, filters);
  const paginatedContacts = filteredContacts.slice(offset, offset + limit);
  const hasMore = filteredContacts.length > offset + paginatedContacts.length;

  return {
    contacts: paginatedContacts,
    count: filteredContacts.length,
    hasMore
  };
};

export default ListContactListContactsService;
