import Contact from "../../models/Contact";

export type ContactListFieldFilter = {
  name: string;
  operator: "equals" | "contains";
  value: string;
};

export type ContactListFilters = {
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
    return {
      tagIds: parsed.tagIds || [],
      fields: parsed.fields || []
    };
  } catch (err) {
    return {};
  }
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
