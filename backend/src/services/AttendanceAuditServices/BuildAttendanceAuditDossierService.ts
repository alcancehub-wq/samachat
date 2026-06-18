import { Op, WhereOptions } from "sequelize";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";

interface Request {
  requesterId: string | number;
  requesterProfile?: string;
  userId: string | number;
  dateFrom: string;
  dateTo: string;
  status?: string;
  limit?: number;
}

interface MessageSample {
  id: string;
  at: Date;
  from: "agent" | "customer";
  body: string;
  mediaType: string | null;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const SAMPLE_LIMIT = 12;
const allowedStatuses = ["open", "pending", "closed", "lost"];

const parseDateOrThrow = (value: string, field: string): Date => {
  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    throw new AppError(`ERR_INVALID_${field.toUpperCase()}`, 400);
  }

  return parsed;
};

const normalizeLimit = (limit?: number): number => {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
};

const secondsBetween = (start?: Date | null, end?: Date | null): number | null => {
  if (!start || !end) {
    return null;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
};

const isAudioMessage = (message: Message): boolean => {
  const mediaType = String(message.mediaType || "").toLowerCase();
  return mediaType.includes("audio") || mediaType.includes("ptt");
};

const buildMessageSample = (messages: Message[]): MessageSample[] => {
  return messages.slice(-SAMPLE_LIMIT).map(message => ({
    id: message.id,
    at: message.createdAt,
    from: message.fromMe ? "agent" : "customer",
    body: message.body || "",
    mediaType: message.mediaType || null
  }));
};

const getLongestAgentSilenceSeconds = (messages: Message[]): number | null => {
  let lastCustomerAt: Date | null = null;
  let longest: number | null = null;

  messages.forEach(message => {
    if (!message.fromMe) {
      lastCustomerAt = message.createdAt;
      return;
    }

    if (lastCustomerAt) {
      const gap = secondsBetween(lastCustomerAt, message.createdAt);

      if (gap !== null && (longest === null || gap > longest)) {
        longest = gap;
      }

      lastCustomerAt = null;
    }
  });

  return longest;
};

const assertCanAuditUser = async ({
  requesterId,
  requesterProfile,
  targetUserId
}: {
  requesterId: string | number;
  requesterProfile?: string;
  targetUserId: string | number;
}): Promise<void> => {
  const isAdmin = String(requesterProfile || "").toLowerCase() === "admin";

  if (isAdmin || Number(requesterId) === Number(targetUserId)) {
    return;
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

const BuildAttendanceAuditDossierService = async ({
  requesterId,
  requesterProfile,
  userId,
  dateFrom,
  dateTo,
  status,
  limit
}: Request): Promise<any> => {
  if (status && !allowedStatuses.includes(status)) {
    throw new AppError("ERR_INVALID_STATUS", 400);
  }

  await assertCanAuditUser({
    requesterId,
    requesterProfile,
    targetUserId: userId
  });

  const parsedDateFrom = startOfDay(parseDateOrThrow(dateFrom, "date_from"));
  const parsedDateTo = endOfDay(parseDateOrThrow(dateTo, "date_to"));
  const parsedDateFromTimestamp = +parsedDateFrom;
  const parsedDateToTimestamp = +parsedDateTo;

  if (parsedDateFrom.getTime() > parsedDateTo.getTime()) {
    throw new AppError("ERR_INVALID_DATE_RANGE", 400);
  }

  const normalizedLimit = normalizeLimit(limit);

  const whereCondition: WhereOptions = {
    userId: Number(userId),
    createdAt: {
      [Op.between]: [parsedDateFromTimestamp, parsedDateToTimestamp]
    }
  };

  if (status) {
    Object.assign(whereCondition, { status });
  }

  const tickets = await Ticket.findAll({
    where: whereCondition,
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
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Message,
        as: "messages",
        where: { isDeleted: false },
        required: false,
        separate: true,
        order: [["createdAt", "ASC"]],
        limit: 300
      }
    ],
    order: [["updatedAt", "DESC"]],
    limit: normalizedLimit
  });

  const dossierTickets = tickets.map(ticket => {
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    const externalMessages = messages.filter(message => !message.isInternal);
    const firstCustomerMessage = externalMessages.find(message => !message.fromMe) || null;
    const firstAgentMessageAfterCustomer =
      firstCustomerMessage
        ? externalMessages.find(
            message =>
              message.fromMe &&
              message.createdAt.getTime() >= firstCustomerMessage.createdAt.getTime()
          ) || null
        : null;

    const lastMessage = externalMessages[externalMessages.length - 1] || null;

    return {
      ticketId: ticket.id,
      status: ticket.status,
      contact: ticket.contact
        ? {
            id: ticket.contact.id,
            name: ticket.contact.name,
            number: ticket.contact.number
          }
        : null,
      queue: ticket.queue
        ? {
            id: ticket.queue.id,
            name: ticket.queue.name,
            color: ticket.queue.color
          }
        : null,
      whatsapp: ticket.whatsapp
        ? {
            id: ticket.whatsapp.id,
            name: ticket.whatsapp.name
          }
        : null,
      assignee: ticket.user
        ? {
            id: ticket.user.id,
            name: ticket.user.name
          }
        : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      firstCustomerMessageAt: firstCustomerMessage?.createdAt || null,
      firstAgentMessageAt: firstAgentMessageAfterCustomer?.createdAt || null,
      firstResponseSeconds: secondsBetween(
        firstCustomerMessage?.createdAt,
        firstAgentMessageAfterCustomer?.createdAt
      ),
      customerMessages: externalMessages.filter(message => !message.fromMe).length,
      agentMessages: externalMessages.filter(message => message.fromMe).length,
      internalMessages: messages.filter(message => message.isInternal).length,
      mediaMessages: messages.filter(message => Boolean(message.mediaType)).length,
      audioMessages: messages.filter(isAudioMessage).length,
      lastMessageAt: lastMessage?.createdAt || null,
      lastMessageFrom: lastMessage ? (lastMessage.fromMe ? "agent" : "customer") : null,
      longestAgentSilenceSeconds: getLongestAgentSilenceSeconds(externalMessages),
      messagesSample: buildMessageSample(externalMessages)
    };
  });

  const responseTimes = dossierTickets
    .map(ticket => ticket.firstResponseSeconds)
    .filter(value => typeof value === "number") as number[];

  const averageFirstResponseSeconds = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
    : null;

  return {
    requested: {
      userId: Number(userId),
      dateFrom: parsedDateFrom,
      dateTo: parsedDateTo,
      status: status || null,
      limit: normalizedLimit
    },
    summary: {
      ticketsAnalyzed: dossierTickets.length,
      averageFirstResponseSeconds,
      ticketsWithCustomerMessage: dossierTickets.filter(ticket => ticket.firstCustomerMessageAt).length,
      ticketsWithoutAgentResponse: dossierTickets.filter(
        ticket => ticket.firstCustomerMessageAt && !ticket.firstAgentMessageAt
      ).length,
      totalCustomerMessages: dossierTickets.reduce(
        (sum, ticket) => sum + ticket.customerMessages,
        0
      ),
      totalAgentMessages: dossierTickets.reduce(
        (sum, ticket) => sum + ticket.agentMessages,
        0
      ),
      totalInternalMessages: dossierTickets.reduce(
        (sum, ticket) => sum + ticket.internalMessages,
        0
      ),
      totalMediaMessages: dossierTickets.reduce(
        (sum, ticket) => sum + ticket.mediaMessages,
        0
      ),
      totalAudioMessages: dossierTickets.reduce(
        (sum, ticket) => sum + ticket.audioMessages,
        0
      )
    },
    tickets: dossierTickets
  };
};

export default BuildAttendanceAuditDossierService;
