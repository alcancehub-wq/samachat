import { Op, fn, where, col, Includeable, WhereOptions, Order } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Task from "../../models/Task";
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

const buildPendingOwnerScope = (
  assignedVisibilityScope: WhereOptions | undefined,
  whatsappVisibilityScope: WhereOptions | undefined
): WhereOptions =>
  combineWhere(
    assignedVisibilityScope,
    whatsappVisibilityScope
  );

const buildPendingUnassignedQueueScope = (
  queueVisibilityScope: WhereOptions | undefined,
  whatsappVisibilityScope: WhereOptions | undefined
): WhereOptions | undefined => {
  if (!queueVisibilityScope) {
    return undefined;
  }

  return combineWhere(
    {
      userId: null
    },
    queueVisibilityScope,
    whatsappVisibilityScope
  );
};

const buildPendingUnassignedWhatsappScope = (
  scopedWhatsappId: number | null
): WhereOptions | undefined => {
  if (!scopedWhatsappId) {
    return undefined;
  }

  return {
    userId: null,
    queueId: null,
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
  queueVisibilityScope,
  whatsappVisibilityScope,
  scopedWhatsappId
}: {
  isAdmin: boolean;
  status?: string;
  assignedVisibilityScope?: WhereOptions;
  queueVisibilityScope?: WhereOptions;
  whatsappVisibilityScope?: WhereOptions;
  scopedWhatsappId?: number | null;
}): WhereOptions => {
  if (isAdmin) {
    return combineWhere(queueVisibilityScope, whatsappVisibilityScope);
  }

  if (status === "pending") {
    const ownerScope = buildPendingOwnerScope(
      assignedVisibilityScope,
      whatsappVisibilityScope
    );
    const unassignedQueueScope = buildPendingUnassignedQueueScope(
      queueVisibilityScope,
      whatsappVisibilityScope
    );
    const unassignedWhatsappScope = buildPendingUnassignedWhatsappScope(
      scopedWhatsappId || null
    );

    return buildPendingVisibilityScope(
      ownerScope,
      unassignedQueueScope,
      unassignedWhatsappScope
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
  const user = isAdmin ? null : await ShowUserService(userId);
  const authorizedQueueIds = user ? extractAuthorizedQueueIds(user) : [];
  const effectiveQueueIds = isAdmin
    ? normalizeQueueIds(queueIds)
    : resolveEffectiveQueueIds(queueIds, authorizedQueueIds);
  const scopedWhatsappId = getScopedWhatsappId(user);
  const queueVisibilityScope = isAdmin
    ? buildAdminQueueVisibilityScope(effectiveQueueIds)
    : buildAuthorizedQueueVisibilityScope(effectiveQueueIds);
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
    whatsappVisibilityScope,
    scopedWhatsappId
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

  const ticketIds = tickets.map(ticket => ticket.id);

  if (ticketIds.length) {
    const taskRows = await Task.findAll({
      where: {
        ticketId: { [Op.in]: ticketIds },
        status: { [Op.ne]: "completed" }
      },
      attributes: ["id", "title", "status", "dueAt", "ticketId", "updatedAt"],
      order: [["updatedAt", "DESC"]]
    });

    const now = new Date();
    const summaries = new Map<number, any>();

    ticketIds.forEach(ticketId => {
      summaries.set(ticketId, {
        status: "none",
        openCount: 0,
        overdueCount: 0,
        scheduledCount: 0,
        noDueCount: 0,
        nextTask: null
      });
    });

    taskRows.forEach(task => {
      const summary = summaries.get(task.ticketId);

      if (!summary) {
        return;
      }

      const dueAt = task.dueAt ? new Date(task.dueAt) : null;
      const isOverdue = Boolean(dueAt && dueAt.getTime() < now.getTime());
      const isScheduled = Boolean(dueAt && dueAt.getTime() >= now.getTime());

      summary.openCount += 1;

      if (isOverdue) {
        summary.overdueCount += 1;
      } else if (isScheduled) {
        summary.scheduledCount += 1;
      } else {
        summary.noDueCount += 1;
      }

      const currentNextDue = summary.nextTask?.dueAt
        ? new Date(summary.nextTask.dueAt).getTime()
        : null;
      const taskDue = dueAt ? dueAt.getTime() : null;

      const shouldReplaceNextTask =
        !summary.nextTask ||
        (isOverdue && summary.status !== "overdue") ||
        (taskDue !== null && (currentNextDue === null || taskDue < currentNextDue));

      if (shouldReplaceNextTask) {
        summary.nextTask = {
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          status: task.status
        };
      }

      if (summary.overdueCount > 0) {
        summary.status = "overdue";
      } else if (summary.scheduledCount > 0) {
        summary.status = "scheduled";
      } else if (summary.openCount > 0) {
        summary.status = "unscheduled";
      }
    });

    tickets.forEach(ticket => {
      (ticket as any).setDataValue(
        "taskSummary",
        summaries.get(ticket.id) || {
          status: "none",
          openCount: 0,
          overdueCount: 0,
          scheduledCount: 0,
          noDueCount: 0,
          nextTask: null
        }
      );
    });
  }

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
