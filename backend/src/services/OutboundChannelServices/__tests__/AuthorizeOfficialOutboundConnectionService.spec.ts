import AuthorizeOfficialOutboundConnectionService, {
  OUTBOUND_PERMISSION
} from "../AuthorizeOfficialOutboundConnectionService";

describe("AuthorizeOfficialOutboundConnectionService", () => {
  it("uses dedicated outbound permission", () => {
    expect(OUTBOUND_PERMISSION).toBe("metaOutbound.send");
  });

  it("rejects non-official connection", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "user",
        userQueueIds: [1],
        connection: {
          providerType: "wwebjs",
          queues: []
        }
      })
    ).toThrow(
      "ERR_META_OUTBOUND_OFFICIAL_CONNECTION_REQUIRED"
    );
  });

  it("allows admin on official connection", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "admin",
        userQueueIds: [],
        connection: {
          providerType: "official",
          queues: []
        }
      })
    ).not.toThrow();
  });

  it("allows shared sector with metaOutbound.send", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "user",
        userQueueIds: [7],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 7,
              permission: {
                permissions: ["metaOutbound.send"]
              }
            }
          ]
        }
      })
    ).not.toThrow();
  });

  it("rejects shared sector with empty permissions", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "user",
        userQueueIds: [7],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 7,
              permission: {
                permissions: []
              }
            }
          ]
        }
      })
    ).toThrow("ERR_NO_PERMISSION");
  });

  it("rejects shared sector with missing permission record", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "user",
        userQueueIds: [7],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 7
            }
          ]
        }
      })
    ).toThrow("ERR_NO_PERMISSION");
  });
  it("does not accept metaTemplates.view as send permission", () => {
    expect(() =>
      AuthorizeOfficialOutboundConnectionService({
        profile: "user",
        userQueueIds: [7],
        connection: {
          providerType: "official",
          queues: [
            {
              id: 7,
              permission: {
                permissions: ["metaTemplates.view"]
              }
            }
          ]
        }
      })
    ).toThrow("ERR_NO_PERMISSION");
  });
});
