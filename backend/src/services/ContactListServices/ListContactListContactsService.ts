import Contact from "../../models/Contact";
import ContactListContact from "../../models/ContactListContact";
import ShowContactListService from "./ShowContactListService";
import {
  parseContactListFilters,
  findDynamicContactListContacts
} from "./contactListFilters";

interface Request {
  listId: string | number;
  pageNumber?: string;
  searchParam?: string;
  overrideDynamicFilters?: ReturnType<typeof parseContactListFilters>;
  forceDynamic?: boolean;
  includeAll?: boolean;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactListContactsService = async ({
  listId,
  pageNumber = "1",
  searchParam = "",
  overrideDynamicFilters,
  forceDynamic = false,
  includeAll = false
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const list = forceDynamic ? null : await ShowContactListService(listId);

  if (list && !list.isDynamic) {
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

  const filters = overrideDynamicFilters || parseContactListFilters(list?.filters);
  const filteredContacts = await findDynamicContactListContacts({
    filters,
    searchParam
  });

  if (includeAll) {
    return {
      contacts: filteredContacts,
      count: filteredContacts.length,
      hasMore: false
    };
  }

  const paginatedContacts = filteredContacts.slice(offset, offset + limit);
  const hasMore = filteredContacts.length > offset + paginatedContacts.length;

  return {
    contacts: paginatedContacts,
    count: filteredContacts.length,
    hasMore
  };
};

export default ListContactListContactsService;
