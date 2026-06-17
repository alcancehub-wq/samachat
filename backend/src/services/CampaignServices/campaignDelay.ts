const DEFAULT_CONTACT_DELAY_MIN_MS = process.env.NODE_ENV === "test" ? 0 : 7000;
const DEFAULT_CONTACT_DELAY_MAX_MS = process.env.NODE_ENV === "test" ? 0 : 15000;

const parseDelayNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getCampaignContactDelayRange = (): { minMs: number; maxMs: number } => {
  const legacyDelayMs = process.env.CAMPAIGN_CONTACT_DELAY_MS;

  if (legacyDelayMs !== undefined) {
    const parsedLegacyDelay = parseDelayNumber(
      legacyDelayMs,
      DEFAULT_CONTACT_DELAY_MIN_MS
    );
    const safeLegacyDelay = Math.max(0, parsedLegacyDelay);

    return {
      minMs: safeLegacyDelay,
      maxMs: safeLegacyDelay
    };
  }

  const minMs = Math.max(
    0,
    parseDelayNumber(
      process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS,
      DEFAULT_CONTACT_DELAY_MIN_MS
    )
  );

  const maxMs = Math.max(
    minMs,
    parseDelayNumber(
      process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS,
      DEFAULT_CONTACT_DELAY_MAX_MS
    )
  );

  return { minMs, maxMs };
};

const getRandomCampaignContactDelayMs = (): number => {
  const { minMs, maxMs } = getCampaignContactDelayRange();

  if (maxMs <= minMs) {
    return minMs;
  }

  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
};

export { getCampaignContactDelayRange, getRandomCampaignContactDelayMs };
