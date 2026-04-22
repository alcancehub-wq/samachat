import Informative from "../../models/Informative";
import ContactList from "../../models/ContactList";
import AppError from "../../errors/AppError";

const ShowInformativeService = async (
  id: string | number
): Promise<Informative> => {
  const informative = await Informative.findByPk(id, {
    include: [
      {
        model: ContactList,
        attributes: ["id", "name", "isActive", "isDynamic"]
      }
    ]
  });

  if (!informative) {
    throw new AppError("ERR_NO_INFORMATIVE_FOUND", 404);
  }

  return informative;
};

export default ShowInformativeService;
