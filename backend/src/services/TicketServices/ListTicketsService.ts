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
import ShowUserService from "../UserServices/ShowUserService";

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

const normalizeQueueIds = (
  queueIds: Array<string | number | null | undefined>
): number[] => {
  return Array.from(
    new Set(
      queueIds
        .map(queueId => Number(queueId))
        .filter(queueId => Number.isInteger(queueId) && queueId > 0)
    )
  );
};

const extractAuthorizedQueueIds = (
  user: Awaited<ReturnType<typeof ShowUserService>>
): number[] => {
  const queues = Array.isArray(user.queues) ? user.queues : [];
  return normalizeQueueIds(queues.map(queue => queue.id));
};

const resolveEffectiveQueueIds = (
  requestedQueueIds: number[],
  authorizedQueueIds: number[]
): number[] => {
  const normalizedRequestedQueueIds = normalizeQueueIds(requestedQueueIds);

  if (!normalizedRequestedQueueIds.length) {
    return authorizedQueueIds;
  }

  const authorizedQueueIdsSet = new Set(authorizedQueueIds);

  return normalizedRequestedQueueIds.filter(queueId =>
    authorizedQueueIdsSet.has(queueId)
  );
};

const buildAdminQueueVisibilityScope = (
  queueIds: number[]
): WhereOptions | undefined => {
  if (!queueIds.length) {
    return undefined;
  }

  return {
    queueId: {
      [Op.or]: [queueIds, null]
    }
  };
};

const buildAuthorizedQueueVisibilityScope = (
  queueIds: number[]
): WhereOptions | undefined => {
  if (!queueIds.length) {
    return undefined;
  }

  return {
    queueId: {
      [Op.in]: queueIds
    }
  };
};

const getScopedWhatsappId = (
  user: Awaited<ReturnType<typeof ShowUserService>> | null
): number | null => {
  if (!user) {
    return null;
  }

  return user.whatsappId || user.whatsapp?.id || null;
};

const buildPendingUnassignedWhatsappScope = (
  scopedWhatsappId: number | null
): WhereOptions | undefined => {
  if (!scopedWhatsappId) {
    return undefined;
  }

  return {
    userId: null,
    whatsappId: scopedWhatsappId
  };
};

const buildPendingVisibilityScope = (
  ...branches: Array<WhereOptions | undefined>
): WhereOptions => {
  const filteredBranches = branches.filter(Boolean) as WhereOptions[];

  if (!filteredBranches.length) {
    return {};
  }

  if (filteredBranches.length === 1) {
    return filteredBranches[0];
  }

  return {
    [Op.or]: filteredBranches
  };
};

const buildVisibilityScope = ({
  isAdmin,
  status,
  assignedVisibilityScope,
  scopedWhatsappId
}: {
  isAdmin: boolean;
  status?: string;
  assignedVisibilityScope?: WhereOptions;
  scopedWhatsappId?: number | null;
}): WhereOptions => {
  if (isAdmin) {
    return {};
  }

  if (status === "pending") {
    const unassignedWhatsappScope = buildPendingUnassignedWhatsappScope(
      scopedWhatsappId || null
    );

    return buildPendingVisibilityScope(
      assignedVisibilityScope,
      unassignedWhatsappScope
    );
  }

  return assignedVisibilityScope || {};
};

const buildRequestedQueueFilterScope = ({
  isAdmin,
  requestedQueueIds,
  hasRequestedQueueFilter
}: {
  isAdmin: boolean;
  requestedQueueIds: number[];
  hasRequestedQueueFilter: boolean;
}): WhereOptions | undefined => {
  if (!hasRequestedQueueFilter) {
    return undefined;
  }

  if (isAdmin) {
    return buildAdminQueueVisibilityScope(requestedQueueIds);
  }

  return buildAuthorizedQueueVisibilityScope(requestedQueueIds) || { id: null };
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
  const user = isAdmin ? null : await ShowUserService(userId);
  const authorizedQueueIds = user ? extractAuthorizedQueueIds(user) : [];
  const normalizedRequestedQueueIds = normalizeQueueIds(queueIds);
  const effectiveQueueIds = isAdmin
    ? normalizedRequestedQueueIds
    : resolveEffectiveQueueIds(queueIds, authorizedQueueIds);
  const scopedWhatsappId = getScopedWhatsappId(user);
  const assignedVisibilityScope: WhereOptions | undefined = isAdmin
    ? undefined
    : ({ userId } as WhereOptions);
  const visibilityScope = buildVisibilityScope({
    isAdmin,
    status,
    assignedVisibilityScope,
    scopedWhatsappId
  });
  const requestedQueueFilterScope = buildRequestedQueueFilterScope({
    isAdmin,
    requestedQueueIds: effectiveQueueIds,
    hasRequestedQueueFilter: normalizedRequestedQueueIds.length > 0
  });
  let whereCondition: WhereOptions = combineWhere(
    visibilityScope,
    requestedQueueFilterScope
  );
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
