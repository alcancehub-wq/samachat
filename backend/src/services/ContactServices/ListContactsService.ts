import { Sequelize, Op } from "sequelize";
import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import GetUserScopedWhatsappId from "../../helpers/GetUserScopedWhatsappId";
import GetContactVisibilityGovernanceSettings from "../../helpers/GetContactVisibilityGovernanceSettings";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  tagIds?: number[];
  userId?: string | number;
  profile?: string;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  tagIds = [],
  userId,
  profile
}: Request): Promise<Response> => {
  const scopedWhatsappId = await GetUserScopedWhatsappId(userId, profile);
  const isAdmin = String(profile || "").toLowerCase() === "admin";
  const currentUserId = Number(userId);
  const normalizedSearchParam = searchParam.toLowerCase().trim();

  const {
    showAllContactsToAllUsers,
    showMultipleConversationContactsToAllUsers,
    fullContactsVisibilityUserIds
  } = await GetContactVisibilityGovernanceSettings();

  const userCanSeeFullContacts =
    isAdmin ||
    showAllContactsToAllUsers ||
    fullContactsVisibilityUserIds.includes(currentUserId);

  const shouldScopeByWhatsapp = Boolean(scopedWhatsappId && !userCanSeeFullContacts);

  const searchCondition = {
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("Contact.name")),
          "LIKE",
          `%${normalizedSearchParam}%`
        )
      },
      { number: { [Op.like]: `%${normalizedSearchParam}%` } }
    ]
  };

  let scopedContactIds: number[] = [];

  if (shouldScopeByWhatsapp) {
    const scopedTickets = await Ticket.findAll({
      attributes: ["contactId"],
      where: {
        whatsappId: scopedWhatsappId
      },
      raw: true
    });

    scopedContactIds = Array.from(
      new Set(
        scopedTickets
          .map(ticket => Number(ticket.contactId))
          .filter(contactId => Number.isInteger(contactId) && contactId > 0)
      )
    );
  }

  const scopedContactCondition = showMultipleConversationContactsToAllUsers
    ? {
        [Op.or]: [
          { allowMultipleConversations: true },
          { id: { [Op.in]: scopedContactIds } }
        ]
      }
    : { id: { [Op.in]: scopedContactIds } };

  const whereCondition = shouldScopeByWhatsapp
    ? {
        [Op.and]: [searchCondition, scopedContactCondition]
      }
    : searchCondition;

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