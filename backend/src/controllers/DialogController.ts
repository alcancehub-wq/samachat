import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListDialogsService from "../services/DialogServices/ListDialogsService";
import CreateDialogService from "../services/DialogServices/CreateDialogService";
import ShowDialogService from "../services/DialogServices/ShowDialogService";
import UpdateDialogService from "../services/DialogServices/UpdateDialogService";
import DeleteDialogService from "../services/DialogServices/DeleteDialogService";
import DuplicateDialogService from "../services/DialogServices/DuplicateDialogService";
import { parseDialogVariables } from "../services/DialogServices/dialogVariables";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam?: string;
};

interface DialogData {
  name: string;
  description?: string;
  content: string;
  variables?: { key: string; label?: string; example?: string }[];
  isActive?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;

  const dialogs = await ListDialogsService({ searchParam });

  return res.json(dialogs);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newDialog: DialogData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    content: Yup.string().required(),
    description: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(newDialog);
  } catch (err) {
    throw new AppError(err.message);
  }

  const dialog = await CreateDialogService(newDialog);

  const io = getIO();
  io.emit("dialog", {
    action: "create",
    dialog
  });

  return res.status(200).json(dialog);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { dialogId } = req.params;

  const dialog = await ShowDialogService(dialogId);
  const dialogData = dialog.toJSON();
  const variables = parseDialogVariables(dialog.variables);

  return res.status(200).json({
    ...dialogData,
    variables
  });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const dialogData: DialogData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string(),
    content: Yup.string(),
    description: Yup.string(),
    isActive: Yup.boolean()
  });

  try {
    await schema.validate(dialogData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { dialogId } = req.params;

  const dialog = await UpdateDialogService({
    dialogId,
    dialogData
  });

  const io = getIO();
  io.emit("dialog", {
    action: "update",
    dialog
  });

  return res.status(200).json(dialog);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { dialogId } = req.params;

  await DeleteDialogService(dialogId);

  const io = getIO();
  io.emit("dialog", {
    action: "delete",
    dialogId
  });

  return res.status(200).json({ message: "Dialog deleted" });
};

export const duplicate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dialogId } = req.params;

  const dialog = await DuplicateDialogService(dialogId);

  const io = getIO();
  io.emit("dialog", {
    action: "create",
    dialog
  });

  return res.status(200).json(dialog);
};
