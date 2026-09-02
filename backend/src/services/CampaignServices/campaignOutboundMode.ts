export const requiresCampaignDialog = (outboundMode?: string | null): boolean =>
  outboundMode !== "OFFICIAL";