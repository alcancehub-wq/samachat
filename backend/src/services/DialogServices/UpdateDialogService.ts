import Dialog from "../../models/Dialog";
import AppError from "../../errors/AppError";
import { DialogVariable, stringifyDialogVariables } from "./dialogVariables";

interface DialogData {
  name?: string;
  description?: string;
  content?: string;
  variables?: DialogVariable[];
  isActive?: boolean;
}

interface Request {
  dialogData: DialogData;
  dialogId: string;
}

const UpdateDialogService = async ({
  dialogData,
  dialogId
}: Request): Promise<Dialog> => {
  const dialog = await Dialog.findOne({
    where: { id: dialogId }
  });

  if (!dialog) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  const nextName = dialogData.name ? dialogData.name.trim() : undefined;

  if (nextName && nextName !== dialog.name) {
    const existing = await Dialog.findOne({
      where: { name: nextName }
    });

    if (existing) {
      throw new AppError("ERR_DUPLICATED_DIALOG");
    }
  }

  await dialog.update({
    name: nextName ?? dialog.name,
    description: dialogData.description ?? dialog.description,
    content: dialogData.content ?? dialog.content,
    variables: dialogData.variables
      ? stringifyDialogVariables(dialogData.variables)
      : dialog.variables,
    isActive:
      typeof dialogData.isActive === "boolean"
        ? dialogData.isActive
        : dialog.isActive
  });

  await dialog.reload();

  return dialog;
};

export default UpdateDialogService;
