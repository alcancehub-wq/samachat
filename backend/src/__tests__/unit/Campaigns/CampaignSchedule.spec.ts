import AppError from "../../../errors/AppError";
import {
  assertCampaignScheduledAtIsFuture,
  parseCampaignScheduledAt
} from "../../../services/CampaignServices/campaignSchedule";

describe("campaignSchedule", () => {
  it("parses datetime-local values with the same Brazil offset used by schedules", () => {
    const parsed = parseCampaignScheduledAt("2026-05-23T12:30");

    expect(parsed.toISOString()).toBe("2026-05-23T15:30:00.000Z");
  });

  it("keeps explicit timezone values unchanged", () => {
    const parsed = parseCampaignScheduledAt("2026-05-23T12:30:00-03:00");

    expect(parsed.toISOString()).toBe("2026-05-23T15:30:00.000Z");
  });

  it("rejects invalid scheduled dates with campaign error code", () => {
    expect(() => parseCampaignScheduledAt("invalid-date")).toThrow(AppError);

    try {
      parseCampaignScheduledAt("invalid-date");
    } catch (error) {
      expect(error).toMatchObject({ message: "ERR_CAMPAIGN_SCHEDULE_INVALID" });
    }
  });

  it("rejects campaign schedules that are not in the future", () => {
    const now = new Date("2026-05-23T15:30:00.000Z");
    const scheduledAt = new Date("2026-05-23T15:30:00.000Z");

    expect(() => assertCampaignScheduledAtIsFuture(scheduledAt, now)).toThrow(
      AppError
    );

    try {
      assertCampaignScheduledAtIsFuture(scheduledAt, now);
    } catch (error) {
      expect(error).toMatchObject({
        message: "ERR_CAMPAIGN_SCHEDULE_MUST_BE_FUTURE"
      });
    }
  });

  it("accepts campaign schedules in the future", () => {
    const now = new Date("2026-05-23T15:30:00.000Z");
    const scheduledAt = new Date("2026-05-23T15:31:00.000Z");

    expect(() => assertCampaignScheduledAtIsFuture(scheduledAt, now)).not.toThrow();
  });
});
