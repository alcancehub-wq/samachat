import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import ListInformativesService from "../services/InformativeServices/ListInformativesService";
import CreateInformativeService from "../services/InformativeServices/CreateInformativeService";
import ShowInformativeService from "../services/InformativeServices/ShowInformativeService";
import UpdateInformativeService from "../services/InformativeServices/UpdateInformativeService";
import DeleteInformativeService from "../services/InformativeServices/DeleteInformativeService";
import { parseInformativeTagIds } from "../services/InformativeServices/informativeTags";


type IndexQuery = {
  searchParam?: string;
  isActive?: string;
  audience?: string;
  contactListId?: string;
};

interface InformativeData {
  title: string;
  content: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  audience?: string;
  contactListId?: number | null;
  tagIds?: number[];
}

const serializeInformative = (informative: any) => {
  const data =
    typeof informative?.toJSON === "function"
      ? informative.toJSON()
      : informative;

  return {
    ...data,
    tagIds: parseInformativeTagIds(informative?.tagIds)
  };
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, isActive, audience, contactListId } =
    req.query as IndexQuery;

  const informatives = await ListInformativesService({
    searchParam,
    audience,
    isActive:
      typeof isActive === "string" ? isActive === "true" : undefined,
    contactListId: contactListId ? Number(contactListId) : undefined
  });

  return res.json(informatives.map(serializeInformative));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newInformative: InformativeData = req.body;

  const schema = Yup.object().shape({
    title: Yup.string().required(),
    content: Yup.string().required(),
    isActive: Yup.boolean(),
    startsAt: Yup.string().nullable(),
    endsAt: Yup.string().nullable(),
    audience: Yup.string(),
    contactListId: Yup.number().nullable(),
    tagIds: Yup.array()
  });

  try {
    await schema.validate(newInformative);
  } catch (err) {
    throw new AppError(err.message);
  }

  const createdInformative = await CreateInformativeService({
    ...newInformative,
    tagIds: newInformative.tagIds || []
  });

  const informative = await ShowInformativeService(createdInformative.id);
  const serializedInformative = serializeInformative(informative);

  const io = getIO();
  io.emit("informative", {
    action: "create",
    informative: serializedInformative
  });

  return res.status(200).json(serializedInformative);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { informativeId } = req.params;

  const informative = await ShowInformativeService(informativeId);

  return res.status(200).json(serializeInformative(informative));
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const informativeData: InformativeData = req.body;

  const schema = Yup.object().shape({
    title: Yup.string(),
    content: Yup.string(),
    isActive: Yup.boolean(),
    startsAt: Yup.string().nullable(),
    endsAt: Yup.string().nullable(),
    audience: Yup.string(),
    contactListId: Yup.number().nullable(),
    tagIds: Yup.array()
  });

  try {
    await schema.validate(informativeData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { informativeId } = req.params;

  const updatedInformative = await UpdateInformativeService({
    informativeId,
    informativeData
  });

  const informative = await ShowInformativeService(updatedInformative.id);
  const serializedInformative = serializeInformative(informative);

  const io = getIO();
  io.emit("informative", {
    action: "update",
    informative: serializedInformative
  });

  return res.status(200).json(serializedInformative);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { informativeId } = req.params;

  await DeleteInformativeService(informativeId);

  const io = getIO();
  io.emit("informative", {
    action: "delete",
    informativeId
  });

  return res.status(200).json({ message: "Informative deleted" });
};
