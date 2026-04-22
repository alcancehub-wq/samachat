import Informative from "../../models/Informative";
import AppError from "../../errors/AppError";

const DeleteInformativeService = async (id: string | number): Promise<void> => {
  const informative = await Informative.findByPk(id);

  if (!informative) {
    throw new AppError("ERR_NO_INFORMATIVE_FOUND", 404);
  }

  await informative.destroy();
};

export default DeleteInformativeService;
