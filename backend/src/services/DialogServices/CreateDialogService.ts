import AppError from "../../errors/AppError";
import Dialog from "../../models/Dialog";
import { stringifyDialogVariables, DialogVariable } from "./dialogVariables";

interface Request {
  name: string;
  description?: string;
  content: string;
  variables?: DialogVariable[];
  isActive?: boolean;
}

const CreateDialogService = async ({
  name,
  description,
  content,
  variables,
  isActive = true
}: Request): Promise<Dialog> => {
  const trimmedName = name.trim();

  const existing = await Dialog.findOne({
    where: { name: trimmedName }
  });

  if (existing) {
    throw new AppError("ERR_DUPLICATED_DIALOG");
  }

  const dialog = await Dialog.create({
    name: trimmedName,
    description,
    content,
    variables: stringifyDialogVariables(variables),
    isActive
  });

  return dialog;
};

export default CreateDialogService;
