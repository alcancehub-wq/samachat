import { applyCampaignTagScope } from "../../../services/CampaignServices/campaignAudience";

describe("RunCampaignWorker", () => {
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
});