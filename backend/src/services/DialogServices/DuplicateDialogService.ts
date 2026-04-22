import Dialog from "../../models/Dialog";
import AppError from "../../errors/AppError";

const buildDuplicateName = async (name: string): Promise<string> => {
  const baseName = `Copia de ${name}`;
  let candidate = baseName;
  let counter = 2;

  while (await Dialog.findOne({ where: { name: candidate } })) {
    candidate = `${baseName} (${counter})`;
    counter += 1;
  }

  return candidate;
};

const DuplicateDialogService = async (id: string): Promise<Dialog> => {
  const dialog = await Dialog.findByPk(id);

  if (!dialog) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  const duplicateName = await buildDuplicateName(dialog.name);

  const newDialog = await Dialog.create({
    name: duplicateName,
    description: dialog.description,
    content: dialog.content,
    variables: dialog.variables,
    isActive: dialog.isActive
  });

  return newDialog;
};

export default DuplicateDialogService;
