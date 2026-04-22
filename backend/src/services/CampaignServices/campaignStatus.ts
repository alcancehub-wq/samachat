export const campaignStatuses = [
  "draft",
  "scheduled",
  "processing",
  "paused",
  "completed",
  "failed",
  "canceled"
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export const normalizeCampaignStatus = (
  value?: string | null
): CampaignStatus => {
  if (!value) {
    return "draft";
  }

  if ((campaignStatuses as readonly string[]).includes(value)) {
    return value as CampaignStatus;
  }

  return "draft";
};
