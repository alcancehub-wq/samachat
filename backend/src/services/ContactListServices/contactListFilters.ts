import { Op, Sequelize, WhereOptions } from "sequelize";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";

export type ContactListFieldFilter = {
  name: string;
  operator: "equals" | "contains";
  value: string;
};

export type ContactListFilters = {
  userId?: number | null;
  excludedContactIds?: number[];
  tagIds?: number[];
  fields?: ContactListFieldFilter[];
};

const normalize = (value: string): string => value.toLowerCase().trim();

export const parseContactListFilters = (filters?: string | null): ContactListFilters => {
  if (!filters) {
    return {};
  }

  try {
    const parsed = JSON.parse(filters) as ContactListFilters;
    const normalizedUserId =
      parsed.userId === null || parsed.userId === undefined
        ? undefined
        : Number(parsed.userId);

    return {
      userId: Number.isNaN(normalizedUserId) ? undefined : normalizedUserId,
      excludedContactIds: (parsed.excludedContactIds || [])
        .map(Number)
        .filter(id => !Number.isNaN(id)),
      tagIds: parsed.tagIds || [],
      fields: parsed.fields || []
    };
  } catch (err) {
    return {};
  }
};

export const resolveContactListAssigneeContactIds = async (
  userId?: number | null
): Promise<number[] | null> => {
  if (typeof userId !== "number") {
    return null;
  }

  const tickets = await Ticket.findAll({
    attributes: ["contactId"],
    where: { userId },
    group: ["contactId"],
    raw: true
  });

  return tickets
    .map(ticket => Number(ticket.contactId))
    .filter(contactId => !Number.isNaN(contactId));
};

export const findDynamicContactListContacts = async ({
  filters,
  searchParam = ""
}: {
  filters: ContactListFilters;
  searchParam?: string;
}): Promise<Contact[]> => {
  const scopedContactIds = await resolveContactListAssigneeContactIds(filters.userId);

  if (scopedContactIds && scopedContactIds.length === 0) {
    return [];
  }

  const excludedContactIds = filters.excludedContactIds || [];
  const trimmedSearchParam = searchParam.toLowerCase().trim();
  const andConditions: WhereOptions[] = [];

  if (scopedContactIds) {
    andConditions.push({ id: { [Op.in]: scopedContactIds } });
  }

  if (excludedContactIds.length > 0) {
    andConditions.push({ id: { [Op.notIn]: excludedContactIds } });
  }

  if (trimmedSearchParam) {
    andConditions.push({
      [Op.or]: [
        {
          name: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Contact.name")),
            "LIKE",
            `%${trimmedSearchParam}%`
          )
        },
        { number: { [Op.like]: `%${trimmedSearchParam}%` } }
      ]
    });
  }

  const whereCondition: WhereOptions | undefined =
    andConditions.length === 0
      ? undefined
      : andConditions.length === 1
        ? andConditions[0]
        : { [Op.and]: andConditions };

  const includeTags = {
    model: Tag,
    as: "tags",
    attributes: ["id", "name", "color"],
    through: { attributes: [] },
    required: filters.tagIds && filters.tagIds.length > 0,
    where:
      filters.tagIds && filters.tagIds.length > 0
        ? { id: { [Op.in]: filters.tagIds } }
        : undefined
  };

  const contacts = await Contact.findAll({
    where: whereCondition,
    include: [
      includeTags,
      {
        model: ContactCustomField,
        as: "extraInfo"
      }
    ],
    order: [["name", "ASC"]]
  });

  return applyContactListFilters(contacts, filters);
};

export const applyContactListFilters = (
  contacts: Contact[],
  filters: ContactListFilters
): Contact[] => {
  const tagIds = filters.tagIds || [];
  const fields = filters.fields || [];

  return contacts.filter(contact => {
    if (tagIds.length > 0) {
      const hasTagMatch = contact.tags?.some(tag => tagIds.includes(tag.id));
      if (!hasTagMatch) {
        return false;
      }
    }

    if (fields.length > 0) {
      const extraInfo = contact.extraInfo || [];
      const hasAllFields = fields.every(field => {
        const matchingFields = extraInfo.filter(info =>
          normalize(info.name) === normalize(field.name)
        );

        if (matchingFields.length === 0) {
          return false;
        }

        const fieldValue = normalize(field.value || "");

        return matchingFields.some(info => {
          const infoValue = normalize(info.value || "");
          if (field.operator === "contains") {
            return infoValue.includes(fieldValue);
          }
          return infoValue === fieldValue;
        });
      });

      if (!hasAllFields) {
        return false;
      }
    }

    return true;
  });
};
