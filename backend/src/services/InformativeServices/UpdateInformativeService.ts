import AppError from "../../errors/AppError";
import Informative from "../../models/Informative";
import ContactList from "../../models/ContactList";
import { stringifyInformativeTagIds } from "./informativeTags";

interface InformativeData {
  title?: string;
  content?: string;
  isActive?: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  audience?: string;
  contactListId?: number | null;
  tagIds?: number[];
}

interface Request {
  informativeId: string;
  informativeData: InformativeData;
}

const UpdateInformativeService = async ({
  informativeId,
  informativeData
}: Request): Promise<Informative> => {
  const informative = await Informative.findOne({
    where: { id: informativeId }
  });

  if (!informative) {
    throw new AppError("ERR_NO_INFORMATIVE_FOUND", 404);
  }

  const nextTitle =
    typeof informativeData.title === "string"
      ? informativeData.title.trim()
      : undefined;

  if (informativeData.title !== undefined && !nextTitle) {
    throw new AppError("ERR_INFORMATIVE_TITLE_REQUIRED");
  }

  if (typeof informativeData.contactListId === "number") {
    const list = await ContactList.findByPk(informativeData.contactListId);
    if (!list) {
      throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
    }
  }

  const nextAudience = informativeData.audience ?? informative.audience;

  if (nextAudience === "contactList") {
    const nextListId =
      informativeData.contactListId !== undefined
        ? informativeData.contactListId
        : informative.contactListId;
    if (!nextListId) {
      throw new AppError("ERR_INFORMATIVE_LIST_REQUIRED");
    }
  }

  if (nextAudience === "tags") {
    let persistedTags: any[] = [];
    if (informative.tagIds) {
      try {
        const parsed = JSON.parse(informative.tagIds);
        persistedTags = Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        persistedTags = [];
      }
    }

    const nextTags =
      informativeData.tagIds !== undefined ? informativeData.tagIds : persistedTags;
    if (!nextTags || nextTags.length === 0) {
      throw new AppError("ERR_INFORMATIVE_TAGS_REQUIRED");
    }
  }

  const startsAtDate =
    informativeData.startsAt !== undefined
      ? informativeData.startsAt
        ? new Date(informativeData.startsAt)
        : null
      : informative.startsAt;
  const endsAtDate =
    informativeData.endsAt !== undefined
      ? informativeData.endsAt
        ? new Date(informativeData.endsAt)
        : null
      : informative.endsAt;

  if (informativeData.startsAt && Number.isNaN(startsAtDate?.getTime())) {
    throw new AppError("ERR_INFORMATIVE_DATE_INVALID");
  }

  if (informativeData.endsAt && Number.isNaN(endsAtDate?.getTime())) {
    throw new AppError("ERR_INFORMATIVE_DATE_INVALID");
  }

  if (startsAtDate && endsAtDate && endsAtDate < startsAtDate) {
    throw new AppError("ERR_INFORMATIVE_DATE_RANGE");
  }

  await informative.update({
    title: nextTitle ?? informative.title,
    content: informativeData.content ?? informative.content,
    isActive:
      typeof informativeData.isActive === "boolean"
        ? informativeData.isActive
        : informative.isActive,
    startsAt: startsAtDate ?? null,
    endsAt: endsAtDate ?? null,
    audience: nextAudience,
    contactListId:
      informativeData.contactListId !== undefined
        ? informativeData.contactListId || null
        : informative.contactListId,
    tagIds:
      informativeData.tagIds !== undefined
        ? stringifyInformativeTagIds(informativeData.tagIds)
        : informative.tagIds
  });

  await informative.reload();

  return informative;
};

export default UpdateInformativeService;
