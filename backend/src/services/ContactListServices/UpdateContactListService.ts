import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";
import ShowContactListService from "./ShowContactListService";
import { ContactListFilters } from "./contactListFilters";

interface Request {
  listId: string | number;
  data: {
    name?: string;
    description?: string;
    isDynamic?: boolean;
    isActive?: boolean;
    filters?: ContactListFilters;
    contactIds?: number[];
  };
}

const UpdateContactListService = async ({
  listId,
  data
}: Request): Promise<ContactList> => {
  const schema = Yup.object().shape({
    name: Yup.string()
  });

  try {
    await schema.validate({ name: data.name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const list = await ShowContactListService(listId);

  const currentFilters = list.filters
    ? typeof list.filters === "string"
      ? list.filters
      : JSON.stringify(list.filters)
    : null;

  await list.update({
    name: data.name ? data.name.trim() : list.name,
    description: data.description,
    isDynamic: data.isDynamic ?? list.isDynamic,
    isActive: data.isActive ?? list.isActive,
    filters: data.filters ? JSON.stringify(data.filters) : currentFilters
  });

  if (data.isDynamic === false && data.contactIds) {
    await list.$set("contacts", data.contactIds);
  }

  if (data.isDynamic === true) {
    await list.$set("contacts", []);
  }

  return list;
};

export default UpdateContactListService;
