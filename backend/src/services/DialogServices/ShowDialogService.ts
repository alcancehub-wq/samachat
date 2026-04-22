import Dialog from "../../models/Dialog";
import AppError from "../../errors/AppError";

const ShowDialogService = async (id: string): Promise<Dialog> => {
  const dialog = await Dialog.findByPk(id);

  if (!dialog) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  return dialog;
};

export default ShowDialogService;
