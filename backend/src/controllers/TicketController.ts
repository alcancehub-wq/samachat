import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import {
  getScopedNotificationRoom,
  getScopedTicketsRoom,
  getUserScopedNotificationRoom,
  getUserScopedTicketsRoom
} from "../helpers/socketRooms";
import SetTicketMessagesAsUnread from "../helpers/SetTicketMessagesAsUnread";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tagIds: string;
  followUp?: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  whatsappId?: number;
  tagIds?: number[];
  followUp?: boolean;
  applyUserDefaultWhatsappOnTransfer?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    withUnreadMessages,
    tagIds: tagIdsStringified,
    followUp
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const profile = req.user.profile;

  let queueIds: number[] = [];
  let tagIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagIds = JSON.parse(tagIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    profile,
    queueIds,
    withUnreadMessages,
    tagIds,
    followUp
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId }: TicketData = req.body;

  const ticket = await CreateTicketService({ contactId, status, userId });

  const io = getIO();
  let broadcaster = io
    .to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId));

  if (ticket.userId) {
    broadcaster = broadcaster
      .to(getUserScopedTicketsRoom(ticket.status, ticket.userId))
      .to(getUserScopedNotificationRoom(ticket.userId));
  }

  broadcaster.emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const contact = await ShowTicketService(ticketId, {
    userId: req.user.id,
    profile: req.user.profile
  });

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId,
    accessData: {
      userId: req.user.id,
      profile: req.user.profile
    }
  });

  if (ticket.status === "closed" && !ticketData.followUp) {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: farewellMessage,
        ticket
      });
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService({
    id: ticketId,
    accessData: {
      userId: req.user.id,
      profile: req.user.profile
    }
  });

  const io = getIO();
  let broadcaster = io
    .to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(ticketId)
    .to(getScopedNotificationRoom(ticket.whatsappId));

  if (ticket.userId) {
    broadcaster = broadcaster
      .to(getUserScopedTicketsRoom(ticket.status, ticket.userId))
      .to(getUserScopedNotificationRoom(ticket.userId));
  }

  broadcaster.emit("ticket", {
    action: "delete",
    ticketId: +ticketId
  });

  return res.status(200).json({ message: "ticket deleted" });
};

export const markAsUnread = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  await ShowTicketService(ticketId, {
    userId: req.user.id,
    profile: req.user.profile
  });

  const ticket = await SetTicketMessagesAsUnread(ticketId);

  return res.status(200).json(ticket);
};
