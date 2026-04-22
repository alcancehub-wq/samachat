import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListContactListsService from "../services/ContactListServices/ListContactListsService";
import CreateContactListService from "../services/ContactListServices/CreateContactListService";
import ShowContactListService from "../services/ContactListServices/ShowContactListService";
import UpdateContactListService from "../services/ContactListServices/UpdateContactListService";
import DeleteContactListService from "../services/ContactListServices/DeleteContactListService";
import ListContactListContactsService from "../services/ContactListServices/ListContactListContactsService";
import { parseContactListFilters } from "../services/ContactListServices/contactListFilters";

import AppError from "../errors/AppError";

type IndexQuery = {
  pageNumber?: string;
  searchParam?: string;
};

interface ContactListData {
  name: string;
  description?: string;
  isDynamic?: boolean;
  isActive?: boolean;
  filters?: {
    tagIds?: number[];
    fields?: { name: string; operator: "equals" | "contains"; value: string }[];
  };
  contactIds?: number[];
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const lists = await ListContactListsService();

  return res.status(200).json(lists);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const listData: ContactListData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(listData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const list = await CreateContactListService(listData);

  const io = getIO();
  io.emit("contactList", {
    action: "create",
    list
  });

  return res.status(200).json(list);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { listId } = req.params;

  const list = await ShowContactListService(listId);
  const listData = list.toJSON();
  const filters = list.filters ? parseContactListFilters(list.filters) : {};

  return res.status(200).json({
    ...listData,
    filters
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { listId } = req.params;
  const listData: ContactListData = req.body;

  const list = await UpdateContactListService({
    listId,
    data: listData
  });

  const io = getIO();
  io.emit("contactList", {
    action: "update",
    list
  });

  return res.status(200).json(list);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { listId } = req.params;

  await DeleteContactListService(listId);

  const io = getIO();
  io.emit("contactList", {
    action: "delete",
    listId
  });

  return res.status(200).json({ message: "Contact list deleted" });
};

export const contacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { listId } = req.params;
  const { pageNumber, searchParam } = req.query as IndexQuery;

  const { contacts, count, hasMore } = await ListContactListContactsService({
    listId,
    pageNumber,
    searchParam
  });

  return res.status(200).json({ contacts, count, hasMore });
};
