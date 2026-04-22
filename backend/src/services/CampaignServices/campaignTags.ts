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

export const normalizeCampaignTagIds = (tagIds?: unknown): number[] => {
  if (!Array.isArray(tagIds)) {
    return [];
  }

  const normalized = tagIds
    .map(id => normalizeTagId(id))
    .filter((id): id is number => typeof id === "number");

  return Array.from(new Set(normalized));
};

export const stringifyCampaignTagIds = (tagIds?: unknown): string | null => {
  const normalized = normalizeCampaignTagIds(tagIds);

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
};

export const parseCampaignTagIds = (value?: string | null): number[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeCampaignTagIds(parsed);
  } catch (error) {
    return [];
  }
};
