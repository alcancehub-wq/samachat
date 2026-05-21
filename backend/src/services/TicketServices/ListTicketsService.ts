import { Op, fn, where, col, Includeable, WhereOptions, Order } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import User from "../../models/User";
import { FOLLOW_UP_TAG_NAME } from "../../utils/followUpTag";
import GetUserScopedWhatsappId from "../../helpers/GetUserScopedWhatsappId";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  userId: string;
  profile?: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tagIds?: number[];
  followUp?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const combineWhere = (
  ...conditions: Array<WhereOptions | undefined>
): WhereOptions => {
  const filteredConditions = conditions.filter(Boolean) as WhereOptions[];

  if (!filteredConditions.length) {
    return {};
  }

  if (filteredConditions.length === 1) {
    return filteredConditions[0];
  }

  return {
    [Op.and]: filteredConditions
  };
};

const buildQueueVisibilityScope = (queueIds: number[]): WhereOptions | undefined => {
  if (!queueIds.length) {
    return undefined;
  }

  return {
    queueId: {
      [Op.or]: [queueIds, null]
    }
  };
};

const buildPendingVisibilityScope = (
  queueVisibilityScope: WhereOptions | undefined,
  whatsappVisibilityScope: WhereOptions | undefined
): WhereOptions => {
  if (queueVisibilityScope || whatsappVisibilityScope) {
    return combineWhere(queueVisibilityScope, whatsappVisibilityScope);
  }

  return { id: -1 };
};

const buildVisibilityScope = ({
  isAdmin,
  status,
  assignedVisibilityScope,
  queueVisibilityScope,
  whatsappVisibilityScope
}: {
  isAdmin: boolean;
  status?: string;
  assignedVisibilityScope?: WhereOptions;
  queueVisibilityScope?: WhereOptions;
  whatsappVisibilityScope?: WhereOptions;
}): WhereOptions => {
  if (isAdmin) {
    return combineWhere(queueVisibilityScope, whatsappVisibilityScope);
  }

  if (status === "pending") {
    return buildPendingVisibilityScope(
      queueVisibilityScope,
      whatsappVisibilityScope
    );
  }

  return combineWhere(
    assignedVisibilityScope,
    queueVisibilityScope,
    whatsappVisibilityScope
  );
};

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  status,
  date,
  showAll,
  userId,
  profile,
  withUnreadMessages,
  tagIds = [],
  followUp
}: Request): Promise<Response> => {
  const isAdmin = String(profile || "").toLowerCase() === "admin";
  const scopedWhatsappId = await GetUserScopedWhatsappId(userId, profile);
  const queueVisibilityScope = buildQueueVisibilityScope(queueIds);
  const whatsappVisibilityScope = scopedWhatsappId
    ? ({ whatsappId: scopedWhatsappId } as WhereOptions)
    : undefined;
  const assignedVisibilityScope: WhereOptions | undefined = isAdmin
    ? undefined
    : ({ userId } as WhereOptions);
  const visibilityScope = buildVisibilityScope({
    isAdmin,
    status,
    assignedVisibilityScope,
    queueVisibilityScope,
    whatsappVisibilityScope
  });
  let whereCondition: WhereOptions = visibilityScope;
  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"],
      through: { attributes: [] },
      required: tagIds.length > 0,
      where: tagIds.length > 0 ? { id: { [Op.in]: tagIds } } : undefined
    }
  ];

  if (status) {
    whereCondition = combineWhere(whereCondition, { status });
  }

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body"],
        where: {
          body: where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        required: false,
        duplicating: false
      }
    ];

    whereCondition = combineWhere(
      whereCondition,
      {
        [Op.or]: [
          {
            "$contact.name$": where(
              fn("LOWER", col("contact.name")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          },
          { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
          {
            "$message.body$": where(
              fn("LOWER", col("body")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          }
        ]
      }
    );
  }

  if (date) {
    whereCondition = combineWhere(whereCondition, {
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    });
  }

  if (withUnreadMessages === "true") {
    whereCondition = combineWhere(
      visibilityScope,
      { unreadMessages: { [Op.gt]: 0 } }
    );
  }

  if (followUp === "true") {
    whereCondition = combineWhere(whereCondition, {
      "$tags.name$": FOLLOW_UP_TAG_NAME
    });
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);
  const order: Order = status === "pending"
    ? [["pendingSince", "DESC"], ["updatedAt", "DESC"]]
    : [["updatedAt", "DESC"]];

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    subQuery: false,
    distinct: true,
    limit,
    offset,
    order
  });

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
