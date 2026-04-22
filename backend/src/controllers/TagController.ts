import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListTagsService from "../services/TagServices/ListTagsService";
import CreateTagService from "../services/TagServices/CreateTagService";
import ShowTagService from "../services/TagServices/ShowTagService";
import UpdateTagService from "../services/TagServices/UpdateTagService";
import DeleteTagService from "../services/TagServices/DeleteTagService";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam?: string;
};

interface TagData {
  name: string;
  color?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;

  const tags = await ListTagsService({ searchParam });

  return res.json(tags);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newTag: TagData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    color: Yup.string()
  });

  try {
    await schema.validate(newTag);
  } catch (err) {
    throw new AppError(err.message);
  }

  const tag = await CreateTagService(newTag);

  const io = getIO();
  io.emit("tag", {
    action: "create",
    tag
  });

  return res.status(200).json(tag);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;

  const tag = await ShowTagService(tagId);

  return res.status(200).json(tag);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const tagData: TagData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    color: Yup.string()
  });

  try {
    await schema.validate(tagData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { tagId } = req.params;

  const tag = await UpdateTagService({
    tagId,
    tagData
  });

  const io = getIO();
  io.emit("tag", {
    action: "update",
    tag
  });

  return res.status(200).json(tag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;

  await DeleteTagService(tagId);

  const io = getIO();
  io.emit("tag", {
    action: "delete",
    tagId
  });

  return res.status(200).json({ message: "Tag deleted" });
};
