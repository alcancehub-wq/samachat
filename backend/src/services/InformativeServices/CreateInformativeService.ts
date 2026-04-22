import AppError from "../../errors/AppError";
import Informative from "../../models/Informative";
import ContactList from "../../models/ContactList";
import { stringifyInformativeTagIds } from "./informativeTags";

interface Request {
  title: string;
  content: string;
  isActive?: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  audience?: string;
  contactListId?: number | null;
  tagIds?: number[];
}

const CreateInformativeService = async ({
  title,
  content,
  isActive = true,
  startsAt,
  endsAt,
  audience = "all",
  contactListId,
  tagIds
}: Request): Promise<Informative> => {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new AppError("ERR_INFORMATIVE_TITLE_REQUIRED");
  }

  if (contactListId) {
    const list = await ContactList.findByPk(contactListId);
    if (!list) {
      throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
    }
  }

  if (audience === "contactList" && !contactListId) {
    throw new AppError("ERR_INFORMATIVE_LIST_REQUIRED");
  }

  if (audience === "tags" && (!tagIds || tagIds.length === 0)) {
    throw new AppError("ERR_INFORMATIVE_TAGS_REQUIRED");
  }

  const startsAtDate = startsAt ? new Date(startsAt) : null;
  const endsAtDate = endsAt ? new Date(endsAt) : null;

  if (startsAt && Number.isNaN(startsAtDate?.getTime())) {
    throw new AppError("ERR_INFORMATIVE_DATE_INVALID");
  }

  if (endsAt && Number.isNaN(endsAtDate?.getTime())) {
    throw new AppError("ERR_INFORMATIVE_DATE_INVALID");
  }

  if (startsAtDate && endsAtDate && endsAtDate < startsAtDate) {
    throw new AppError("ERR_INFORMATIVE_DATE_RANGE");
  }

  const informative = await Informative.create({
    title: trimmedTitle,
    content,
    isActive,
    startsAt: startsAtDate,
    endsAt: endsAtDate,
    audience,
    contactListId: contactListId || null,
    tagIds: stringifyInformativeTagIds(tagIds)
  });

  return informative;
};

export default CreateInformativeService;
