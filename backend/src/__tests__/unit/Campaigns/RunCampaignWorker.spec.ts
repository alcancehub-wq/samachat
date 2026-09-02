import { applyCampaignTagScope } from "../../../services/CampaignServices/campaignAudience";
import {
  getCampaignContactDelayRange,
  getRandomCampaignContactDelayMs
} from "../../../services/CampaignServices/campaignDelay";
import { requiresCampaignDialog } from "../../../services/CampaignServices/campaignOutboundMode";

describe("RunCampaignWorker", () => {
  it("should preserve the dialog requirement for standard campaigns", () => {
    expect(requiresCampaignDialog("STANDARD")).toBe(true);
    expect(requiresCampaignDialog()).toBe(true);
  });

  it("should not require or load a dialog for official campaigns", () => {
    expect(requiresCampaignDialog("OFFICIAL")).toBe(false);
  });

  it("should keep only contacts matching campaign tags when list and tags are combined", () => {
    const contacts = [
      {
        id: 1,
        tags: [{ id: 10 }, { id: 20 }]
      },
      {
        id: 2,
        tags: [{ id: 30 }]
      },
      {
        id: 3,
        tags: []
      }
    ] as any[];

    const result = applyCampaignTagScope(contacts as any, [10]);

    expect(result.map(contact => contact.id)).toEqual([1]);
  });

  it("should preserve the original list scope when campaign tags are not defined", () => {
    const contacts = [
      { id: 1, tags: [{ id: 10 }] },
      { id: 2, tags: [] }
    ] as any[];

    const result = applyCampaignTagScope(contacts as any, []);

    expect(result.map(contact => contact.id)).toEqual([1, 2]);
  });

  it("should dedupe contacts after applying the campaign scope", () => {
    const contacts = [
      { id: 7, tags: [{ id: 10 }] },
      { id: 7, tags: [{ id: 10 }] },
      { id: 8, tags: [{ id: 10 }] }
    ] as any[];

    const result = applyCampaignTagScope(contacts as any, [10]);

    expect(result.map(contact => contact.id)).toEqual([7, 8]);
  });

  const originalCampaignDelayEnv = {
    legacy: process.env.CAMPAIGN_CONTACT_DELAY_MS,
    min: process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS,
    max: process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS
  };

  const restoreCampaignDelayEnv = (): void => {
    if (originalCampaignDelayEnv.legacy === undefined) {
      delete process.env.CAMPAIGN_CONTACT_DELAY_MS;
    } else {
      process.env.CAMPAIGN_CONTACT_DELAY_MS = originalCampaignDelayEnv.legacy;
    }

    if (originalCampaignDelayEnv.min === undefined) {
      delete process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS;
    } else {
      process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS = originalCampaignDelayEnv.min;
    }

    if (originalCampaignDelayEnv.max === undefined) {
      delete process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS;
    } else {
      process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS = originalCampaignDelayEnv.max;
    }
  };

  afterEach(() => {
    restoreCampaignDelayEnv();
    jest.restoreAllMocks();
  });

  it("should preserve legacy campaign contact delay as a fixed delay", () => {
    process.env.CAMPAIGN_CONTACT_DELAY_MS = "9000";
    process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS = "7000";
    process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS = "15000";

    expect(getCampaignContactDelayRange()).toEqual({
      minMs: 9000,
      maxMs: 9000
    });
    expect(getRandomCampaignContactDelayMs()).toBe(9000);
  });

  it("should randomize campaign contact delay within the configured range", () => {
    delete process.env.CAMPAIGN_CONTACT_DELAY_MS;
    process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS = "7000";
    process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS = "15000";

    jest.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.999999);

    expect(getCampaignContactDelayRange()).toEqual({
      minMs: 7000,
      maxMs: 15000
    });
    expect(getRandomCampaignContactDelayMs()).toBe(7000);
    expect(getRandomCampaignContactDelayMs()).toBe(15000);
  });

  it("should never return a campaign contact delay below the configured minimum", () => {
    delete process.env.CAMPAIGN_CONTACT_DELAY_MS;
    process.env.CAMPAIGN_CONTACT_DELAY_MIN_MS = "12000";
    process.env.CAMPAIGN_CONTACT_DELAY_MAX_MS = "7000";

    expect(getCampaignContactDelayRange()).toEqual({
      minMs: 12000,
      maxMs: 12000
    });
    expect(getRandomCampaignContactDelayMs()).toBe(12000);
  });
});
