import ContactList from "../../models/ContactList";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";

const ShowContactListService = async (
  id: string | number
): Promise<ContactList> => {
  const list = await ContactList.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contacts",
        attributes: ["id", "name", "number"],
        through: { attributes: [] }
      }
    ]
  });

  if (!list) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  return list;
};

export default ShowContactListService;
