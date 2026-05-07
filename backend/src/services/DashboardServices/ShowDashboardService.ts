import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays
} from "date-fns";
import { Op, fn, col, WhereOptions } from "sequelize";

import Campaign from "../../models/Campaign";
import Contact from "../../models/Contact";
import Flow from "../../models/Flow";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Schedule from "../../models/Schedule";
import Task from "../../models/Task";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import ShowUserService from "../UserServices/ShowUserService";

type DashboardPeriod = "today" | "7d" | "30d";

interface Request {
  userId: string | number;
  profile: string;
  period?: DashboardPeriod;
  queueId?: number;
  assigneeId?: number;
}

interface QueueMetric {
  queueId: number | null;
  queueName: string | null;
  open: number;
  pending: number;
  total: number;
}

interface TimelineHourMetric {
  bucketHour: string | number;
  count: string | number;
}

const FIRST_RESPONSE_TARGET_MINUTES = 15;

const combineWhere = (...conditions: Array<WhereOptions | undefined>): WhereOptions => {
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

const resolveRange = (period: DashboardPeriod, now: Date) => {
  if (period === "30d") {
    return {
      start: startOfDay(subDays(now, 29)),
      end: endOfDay(now)
    };
  }

  if (period === "7d") {
    return {
      start: startOfDay(subDays(now, 6)),
      end: endOfDay(now)
    };
  }

  return {
    start: startOfDay(now),
    end: endOfDay(now)
  };
};

const buildVisibleTicketWhere = (
  queueIds: number[],
  isAdmin: boolean,
  selectedQueueId?: number,
  selectedAssigneeId?: number
): WhereOptions => {
  if (selectedQueueId && !isAdmin && !queueIds.includes(selectedQueueId)) {
    return { id: -1 };
  }

  const visibilityScope = isAdmin
    ? undefined
    : queueIds.length > 0
    ? {
        [Op.or]: [{ queueId: { [Op.in]: queueIds } }, { queueId: null }]
      }
    : { queueId: null };

  const queueScope = selectedQueueId ? { queueId: selectedQueueId } : undefined;
  const assigneeScope = selectedAssigneeId
    ? { userId: selectedAssigneeId }
    : undefined;

  return combineWhere(visibilityScope, queueScope, assigneeScope);
};

const buildTimeline = (
  period: DashboardPeriod,
  timelineSource: Array<{ createdAt: string | Date }> | TimelineHourMetric[],
  rangeStart: Date,
  rangeEnd: Date
) => {
  if (period === "today") {
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      label: `${String(index + 8).padStart(2, "0")}:00`,
      count: 0
    }));

    (timelineSource as TimelineHourMetric[]).forEach(row => {
      const hour = Number(row.bucketHour);

      if (hour >= 8 && hour <= 19) {
        buckets[hour - 8].count = Number(row.count || 0);
      }
    });

    return buckets;
  }

  const buckets = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(
    currentDay => ({
      label: format(currentDay, "dd/MM"),
      count: 0
    })
  );

  const bucketMap = new Map(buckets.map(bucket => [bucket.label, bucket]));

  (timelineSource as Array<{ createdAt: string | Date }>).forEach(ticket => {
    const label = format(new Date(ticket.createdAt), "dd/MM");
    const bucket = bucketMap.get(label);

    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets;
};

const calculateAverage = (values: number[]) => {
  if (!values.length) {
    return null;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
};

const ShowDashboardService = async ({
  userId,
  profile,
  period = "today",
  queueId,
  assigneeId
}: Request) => {
  const isAdmin = String(profile || "").toLowerCase() === "admin";
  const normalizedPeriod: DashboardPeriod =
    period === "7d" || period === "30d" ? period : "today";
  const now = new Date();
  const { start: rangeStart, end: rangeEnd } = resolveRange(normalizedPeriod, now);

  const user = isAdmin ? null : await ShowUserService(userId);
  const visibleQueueIds = user?.queues?.map(queue => queue.id) || [];
  const resolvedAssigneeId = assigneeId;

  const visibleTicketWhere = buildVisibleTicketWhere(
    visibleQueueIds,
    isAdmin,
    queueId,
    resolvedAssigneeId
  );

  const ticketRangeWhere = combineWhere(visibleTicketWhere, {
    createdAt: { [Op.between]: [+rangeStart, +rangeEnd] }
  });

  const recentTicketWhere = combineWhere(visibleTicketWhere, {
    updatedAt: { [Op.gte]: +rangeStart }
  });

  const taskScope = combineWhere(
    { status: { [Op.ne]: "completed" } },
    resolvedAssigneeId ? { assigneeId: resolvedAssigneeId } : undefined
  );

  const scheduleScope = combineWhere(
    { status: "pending" },
    resolvedAssigneeId ? { assigneeId: resolvedAssigneeId } : undefined
  );

  const [
    openTickets,
    pendingTickets,
    closedTickets,
    unreadTickets,
    contactsCount,
    ticketsInPeriodCount,
    periodTickets,
    queueBreakdownRows,
    queues,
    recentTickets,
    whatsapps,
    openTasks,
    overdueTasks,
    urgentTasks,
    pendingSchedules,
    scheduledInPeriodCount,
    upcomingSchedules,
    publishedFlows,
    scheduledCampaigns,
    slaTickets
  ] = await Promise.all([
    Ticket.count({ where: combineWhere(visibleTicketWhere, { status: "open" }) }),
    Ticket.count({ where: combineWhere(visibleTicketWhere, { status: "pending" }) }),
    Ticket.count({ where: combineWhere(visibleTicketWhere, { status: "closed" }) }),
    Ticket.count({
      where: combineWhere(visibleTicketWhere, { unreadMessages: { [Op.gt]: 0 } })
    }),
    Contact.count({ where: { isGroup: false } }),
    Ticket.count({ where: ticketRangeWhere }),
    normalizedPeriod === "today"
      ? Ticket.findAll({
          attributes: [
            [fn("HOUR", col("createdAt")), "bucketHour"],
            [fn("COUNT", col("Ticket.id")), "count"]
          ],
          where: ticketRangeWhere,
          group: [fn("HOUR", col("createdAt"))],
          raw: true
        })
      : Ticket.findAll({
          attributes: ["createdAt"],
          where: ticketRangeWhere,
          raw: true
        }),
    Ticket.findAll({
      attributes: ["queueId", "status", [fn("COUNT", col("Ticket.id")), "count"]],
      where: combineWhere(visibleTicketWhere, {
        status: { [Op.in]: ["open", "pending"] }
      }),
      group: ["queueId", "status"],
      raw: true
    }),
    Queue.findAll({
      attributes: ["id", "name"],
      order: [["sortOrder", "ASC"], ["name", "ASC"]]
    }),
    Ticket.findAll({
      attributes: [
        "id",
        "status",
        "createdAt",
        "updatedAt",
        "lastMessage",
        "unreadMessages"
      ],
      where: recentTicketWhere,
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number"]
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
        }
      ],
      order: [["updatedAt", "DESC"]],
      limit: 6
    }),
    Whatsapp.findAll({
      attributes: ["id", "name", "status", "updatedAt"],
      order: [["updatedAt", "DESC"]]
    }),
    Task.count({ where: taskScope }),
    Task.count({
      where: combineWhere(taskScope, {
        dueAt: { [Op.lt]: +now }
      })
    }),
    Task.findAll({
      attributes: ["id", "title", "priority", "status", "dueAt"],
      where: taskScope,
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name"]
        }
      ],
      order: [["dueAt", "ASC"]],
      limit: 5
    }),
    Schedule.count({ where: scheduleScope }),
    Schedule.count({
      where: combineWhere(scheduleScope, {
        scheduledAt: { [Op.between]: [+rangeStart, +rangeEnd] }
      })
    }),
    Schedule.findAll({
      attributes: ["id", "body", "status", "scheduledAt"],
      where: combineWhere(scheduleScope, {
        scheduledAt: { [Op.gte]: +now }
      }),
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number"]
        },
        {
          model: User,
          as: "assignee",
          attributes: ["id", "name"]
        }
      ],
      order: [["scheduledAt", "ASC"]],
      limit: 5
    }),
    Flow.count({ where: { status: "published", isActive: true } }),
    Campaign.count({ where: { status: "scheduled" } }),
    Ticket.findAll({
      attributes: ["id", "status", "createdAt", "updatedAt"],
      where: ticketRangeWhere,
      raw: true
    })
  ]);

  const slaTicketIds = (slaTickets as Array<{ id: number }>).map(ticket => ticket.id);

  const firstResponseMessages = slaTicketIds.length
    ? await Message.findAll({
        attributes: ["ticketId", "createdAt"],
        where: {
          fromMe: true,
          ticketId: { [Op.in]: slaTicketIds }
        },
        raw: true,
        order: [["ticketId", "ASC"], ["createdAt", "ASC"]]
      })
    : [];

  const queueLabelMap = new Map(queues.map(queue => [queue.id, queue.name]));
  const queueBreakdownMap = new Map<string, QueueMetric>();

  (
    queueBreakdownRows as unknown as Array<{
      queueId: number | null;
      status: string;
      count: string | number;
    }>
  ).forEach(row => {
    const resolvedQueueId = row.queueId === null ? null : Number(row.queueId);
    const key = resolvedQueueId === null ? "unassigned" : String(resolvedQueueId);
    const count = Number(row.count || 0);
    const current = queueBreakdownMap.get(key) || {
      queueId: resolvedQueueId,
      queueName:
        resolvedQueueId === null ? null : queueLabelMap.get(resolvedQueueId) || null,
      open: 0,
      pending: 0,
      total: 0
    };

    if (row.status === "open") {
      current.open = count;
    }

    if (row.status === "pending") {
      current.pending = count;
    }

    current.total += count;
    queueBreakdownMap.set(key, current);
  });

  const ticketsByQueue = Array.from(queueBreakdownMap.values())
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);

  const ticketsTimeline = buildTimeline(
    normalizedPeriod,
    periodTickets as Array<{ createdAt: string | Date }>,
    rangeStart,
    rangeEnd
  );

  const firstResponseMap = new Map<number, Date>();

  (firstResponseMessages as Array<{ ticketId: number; createdAt: string | Date }>).forEach(
    message => {
      if (!firstResponseMap.has(message.ticketId)) {
        firstResponseMap.set(message.ticketId, new Date(message.createdAt));
      }
    }
  );

  const responseTimes = (slaTickets as Array<{
    id: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    status: string;
  }>)
    .map(ticket => {
      const firstResponseAt = firstResponseMap.get(ticket.id);

      if (!firstResponseAt) {
        return null;
      }

      const createdAt = new Date(ticket.createdAt).getTime();
      const responseAt = firstResponseAt.getTime();

      return Math.max(0, (responseAt - createdAt) / 60000);
    })
    .filter((value): value is number => value !== null);

  const closedResolutionHours = (slaTickets as Array<{
    createdAt: string | Date;
    updatedAt: string | Date;
    status: string;
  }>)
    .filter(ticket => ticket.status === "closed")
    .map(ticket => {
      const createdAt = new Date(ticket.createdAt).getTime();
      const updatedAt = new Date(ticket.updatedAt).getTime();

      return Math.max(0, (updatedAt - createdAt) / 3600000);
    });

  const connectedStatuses = new Set(["CONNECTED"]);
  const attentionStatuses = new Set(["OPENING", "PAIRING", "TIMEOUT", "qrcode"]);

  const connectionSummary = whatsapps.reduce(
    (accumulator, whatsApp) => {
      if (connectedStatuses.has(whatsApp.status)) {
        accumulator.connected += 1;
      } else if (attentionStatuses.has(whatsApp.status)) {
        accumulator.attention += 1;
      } else {
        accumulator.disconnected += 1;
      }

      return accumulator;
    },
    { connected: 0, attention: 0, disconnected: 0 }
  );

  const firstResponseRate = responseTimes.length
    ? Math.round(
        (responseTimes.filter(value => value <= FIRST_RESPONSE_TARGET_MINUTES).length /
          responseTimes.length) *
          100
      )
    : null;

  return {
    summary: {
      openTickets,
      pendingTickets,
      closedTickets,
      unreadTickets,
      contactsCount,
      ticketsInPeriodCount,
      ticketsTodayCount: ticketsInPeriodCount,
      connectedConnections: connectionSummary.connected,
      attentionConnections: connectionSummary.attention,
      disconnectedConnections: connectionSummary.disconnected,
      openTasks,
      overdueTasks,
      pendingSchedules,
      scheduledInPeriodCount,
      todaySchedules: scheduledInPeriodCount,
      publishedFlows,
      scheduledCampaigns
    },
    sla: {
      targetMinutes: FIRST_RESPONSE_TARGET_MINUTES,
      firstResponseRate,
      averageFirstResponseMinutes: calculateAverage(responseTimes),
      averageResolutionHours: calculateAverage(closedResolutionHours),
      respondedTickets: responseTimes.length
    },
    charts: {
      ticketsTimeline,
      timelineMode: normalizedPeriod === "today" ? "hour" : "day",
      ticketsByQueue
    },
    filters: {
      period: normalizedPeriod,
      queueId: queueId || null,
      assigneeId: resolvedAssigneeId || null
    },
    connections: whatsapps.slice(0, 6).map(whatsApp => ({
      id: whatsApp.id,
      name: whatsApp.name,
      status: whatsApp.status,
      updatedAt: whatsApp.updatedAt
    })),
    recentTickets: recentTickets.map(ticket => ({
      id: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      unreadMessages: ticket.unreadMessages,
      lastMessage: ticket.lastMessage,
      contactName: ticket.contact?.name || ticket.contact?.number || null,
      queueName: ticket.queue?.name || null,
      userName: ticket.user?.name || null
    })),
    urgentTasks: urgentTasks
      .filter(task => Boolean(task.dueAt))
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt,
        assigneeName: task.assignee?.name || null
      })),
    upcomingSchedules: upcomingSchedules.map(schedule => ({
      id: schedule.id,
      body: schedule.body,
      status: schedule.status,
      scheduledAt: schedule.scheduledAt,
      contactName: schedule.contact?.name || schedule.contact?.number || null,
      assigneeName: schedule.assignee?.name || null
    }))
  };
};

export default ShowDashboardService;