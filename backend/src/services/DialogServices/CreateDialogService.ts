import AppError from "../../errors/AppError";
import Dialog from "../../models/Dialog";
import { stringifyDialogVariables, DialogVariable } from "./dialogVariables";

interface Request {
  name: string;
  description?: string;
  content?: string;
  variables?: DialogVariable[];
  isActive?: boolean;
  mediaFileName?: string | null;
  mediaOriginalName?: string | null;
  mediaMimeType?: string | null;
}

const CreateDialogService = async ({
  name,
  description,
  content,
  variables,
  isActive = true,
  mediaFileName = null,
  mediaOriginalName = null,
  mediaMimeType = null
}: Request): Promise<Dialog> => {
  const trimmedName = name.trim();
  const trimmedContent = (content || "").trim();

  const existing = await Dialog.findOne({
    where: { name: trimmedName }
  });

  if (existing) {
    throw new AppError("ERR_DUPLICATED_DIALOG");
  }

  if (!trimmedContent && !mediaFileName) {
    throw new AppError("ERR_DIALOG_CONTENT_OR_MEDIA_REQUIRED", 400);
  }

  const dialog = await Dialog.create({
    name: trimmedName,
    description,
    content: trimmedContent,
    mediaFileName,
    mediaOriginalName,
    mediaMimeType,
    variables: stringifyDialogVariables(variables),
    isActive
  });

  return dialog;
};

export default CreateDialogService;
