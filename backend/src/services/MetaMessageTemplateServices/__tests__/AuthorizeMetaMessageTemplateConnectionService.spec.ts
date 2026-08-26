import AuthorizeMetaMessageTemplateConnectionService from "../AuthorizeMetaMessageTemplateConnectionService";

describe("AuthorizeMetaMessageTemplateConnectionService", () => {
  it("rejects non-official connections", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "admin",
        permission: "metaTemplates.view",
        userQueueIds: [],
        connection: { providerType: "legacy", queues: [] }
      })
    ).toThrow(expect.objectContaining({
      message: "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED",
      statusCode: 400
    }));
  });

  it("allows admin on official connection without sector match", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "admin",
        permission: "metaTemplates.view",
        userQueueIds: [],
        connection: { providerType: " OFFICIAL ", queues: [] }
      })
    ).not.toThrow();
  });

  it("allows permission on the same shared sector", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "user",
        permission: "metaTemplates.create",
        userQueueIds: [10],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 10,
              permission: {
                permissions: ["metaTemplates.create"]
              }
            }
          ]
        }
      })
    ).not.toThrow();
  });

  it("does not authorize permission that exists only in another sector", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "user",
        permission: "metaTemplates.view",
        userQueueIds: [10, 20],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 10,
              permission: { permissions: ["campaigns.view"] }
            }
          ]
        }
      })
    ).toThrow(expect.objectContaining({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    }));
  });

  it("denies when shared sector lacks requested permission", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "user",
        permission: "metaTemplates.delete",
        userQueueIds: [7],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 7,
              permission: { permissions: ["metaTemplates.view"] }
            }
          ]
        }
      })
    ).toThrow(expect.objectContaining({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    }));
  });

  it("uses default permissions for empty shared-sector permissions", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "user",
        permission: "metaTemplates.view",
        userQueueIds: [3],
        connection: {
          providerType: "official",
          queues: [
            { id: 3, permission: { permissions: [] } }
          ]
        }
      })
    ).not.toThrow();
  });

  it("fails closed on invalid JSON permissions", () => {
    expect(() =>
      AuthorizeMetaMessageTemplateConnectionService({
        profile: "user",
        permission: "metaTemplates.view",
        userQueueIds: [5],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 5,
              permission: { permissions: "{invalid-json" }
            }
          ]
        }
      })
    ).toThrow(expect.objectContaining({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    }));
  });
});
