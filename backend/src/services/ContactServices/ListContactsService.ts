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

  const shouldScopeByWhatsapp = Boolean(scopedWhatsappId && !userCanSeeFullContacts);

  const whereCondition =
    showMultipleConversationContactsToAllUsers && shouldScopeByWhatsapp
      ? {
          [Op.and]: [
            searchCondition,
            {
              [Op.or]: [
                { allowMultipleConversations: true },
                { "$tickets.id$": { [Op.ne]: null } }
              ]
            }
          ]
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

  const includeTickets = shouldScopeByWhatsapp
    ? {
        model: Ticket,
        as: "tickets",
        attributes: [],
        required: !showMultipleConversationContactsToAllUsers,
        where: {
          whatsappId: scopedWhatsappId
        }
      }
    : undefined;

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    include: [includeTags, ...(includeTickets ? [includeTickets] : [])],
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