import ContactList from "../../models/ContactList";

const ListContactListsService = async (): Promise<ContactList[]> => {
  const lists = await ContactList.findAll({
    order: [["name", "ASC"]]
  });

  return lists;
};

export default ListContactListsService;
