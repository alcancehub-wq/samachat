const normalizeTagId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const normalizeInformativeTagIds = (tagIds?: unknown): number[] => {
  if (!Array.isArray(tagIds)) {
    return [];
  }

  const normalized = tagIds
    .map(id => normalizeTagId(id))
    .filter((id): id is number => typeof id === "number");

  return Array.from(new Set(normalized));
};

export const stringifyInformativeTagIds = (tagIds?: unknown): string | null => {
  const normalized = normalizeInformativeTagIds(tagIds);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
};

export const parseInformativeTagIds = (value?: string | null): number[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeInformativeTagIds(parsed);
  } catch (error) {
    return [];
  }
};
