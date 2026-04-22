import * as Yup from "yup";
import { Request, Response } from "express";
import AppError from "../../errors/AppError";

import ListKanbanService from "../../services/KanbanServices/ListKanbanService";
import MoveKanbanCardService from "../../services/KanbanServices/MoveKanbanCardService";
import ListKanbanColumnsService from "../../services/KanbanServices/ListKanbanColumnsService";
import CreateKanbanColumnService from "../../services/KanbanServices/CreateKanbanColumnService";
import UpdateKanbanColumnService from "../../services/KanbanServices/UpdateKanbanColumnService";
import ReorderKanbanColumnsService from "../../services/KanbanServices/ReorderKanbanColumnsService";

type IndexQuery = {
  searchParam?: string;
  queueIds?: string;
  userId?: string;
  tagIds?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, queueIds, userId, tagIds } = req.query as IndexQuery;

  const parsedQueueIds = queueIds ? JSON.parse(queueIds) : [];
  const parsedTagIds = tagIds ? JSON.parse(tagIds) : [];

  const columns = await ListKanbanService({
    searchParam,
    queueIds: parsedQueueIds,
    userId: userId ? Number(userId) : undefined,
    tagIds: parsedTagIds
  });

  const totalCards = columns.reduce((sum, column) => sum + column.count, 0);

  return res.status(200).json({
    data: columns,
    meta: {
      columns: columns.length,
      cards: totalCards
    }
  });
};

export const move = async (req: Request, res: Response): Promise<Response> => {
  const schema = Yup.object().shape({
    ticketId: Yup.number().required(),
    columnId: Yup.number().required(),
    orderedTicketIds: Yup.array().of(Yup.number()).required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { ticketId, columnId, orderedTicketIds } = req.body;

  await MoveKanbanCardService({
    ticketId,
    columnId,
    orderedTicketIds
  });

  return res.status(200).json({
    data: {
      success: true
    }
  });
};

export const columnsIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const columns = await ListKanbanColumnsService();

  return res.status(200).json({
    data: columns,
    meta: {
      count: columns.length
    }
  });
};

export const columnsStore = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().required(),
    key: Yup.string().nullable(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const column = await CreateKanbanColumnService(req.body);

  return res.status(200).json({ data: column });
};

export const columnsUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string(),
    key: Yup.string().nullable(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { columnId } = req.params;

  const column = await UpdateKanbanColumnService({
    columnId,
    columnData: req.body
  });

  return res.status(200).json({ data: column });
};

export const columnsReorder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    orderedColumnIds: Yup.array().of(Yup.number()).required()
  });

  try {
    await schema.validate(req.body);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { orderedColumnIds } = req.body;

  await ReorderKanbanColumnsService({ orderedColumnIds });

  return res.status(200).json({
    data: {
      success: true
    }
  });
};
