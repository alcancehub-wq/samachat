import Dialog from "../../models/Dialog";
import AppError from "../../errors/AppError";

const DeleteDialogService = async (id: string): Promise<void> => {
  const dialog = await Dialog.findOne({
    where: { id }
  });

  if (!dialog) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  await dialog.destroy();
};

export default DeleteDialogService;
