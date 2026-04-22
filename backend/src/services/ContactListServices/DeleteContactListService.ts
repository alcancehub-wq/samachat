import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";

const DeleteContactListService = async (id: string | number): Promise<void> => {
  const list = await ContactList.findByPk(id);

  if (!list) {
    throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
  }

  await list.destroy();
};

export default DeleteContactListService;
