import * as Yup from "yup";
import AppError from "../../errors/AppError";
import ContactList from "../../models/ContactList";

import { ContactListFilters } from "./contactListFilters";

interface Request {
  name: string;
  description?: string;
  isDynamic?: boolean;
  isActive?: boolean;
  filters?: ContactListFilters;
  contactIds?: number[];
}

const CreateContactListService = async ({
  name,
  description,
  isDynamic = false,
  isActive = true,
  filters,
  contactIds = []
}: Request): Promise<ContactList> => {
  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate({ name });
  } catch (err) {
    throw new AppError(err.message);
  }

  const list = await ContactList.create({
    name: name.trim(),
    description,
    isDynamic,
    isActive,
    filters: filters ? JSON.stringify(filters) : null
  });

  if (!isDynamic && contactIds.length > 0) {
    await list.$set("contacts", contactIds);
  }

  return list;
};

export default CreateContactListService;
