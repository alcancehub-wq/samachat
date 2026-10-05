import {
  IdentifyMessageProvenance,
  MessageProvenance,
  MessageProvenanceKind,
  MessageProvenanceProvider,
  ResolveMessageProvenance
} from "../MessageProvenance";
import BuildCrmContactIntentService, {
  CrmContactIntentContext
} from "../../../services/CrmIntegrationServices/BuildCrmContactIntentService";

describe("MessageProvenance", () => {
  it.each([
    ["wwebjs", "message", false, "realtime"],
    ["wwebjs", "message_create", false, "realtime"],
    ["wwebjs", "media_uploaded", false, "realtime"],
    ["wwebjs", "message_create", true, "outbound"],
    ["wwebjs", "media_uploaded", true, "outbound"],
    ["wwebjs", "sync_unread", false, "history"],
    ["wwebjs", "sync_unread", true, "history"],
    ["wwebjs", "reconciliation", false, "reconciliation"],
    ["wwebjs", "reconciliation", true, "reconciliation"],
    ["wwebjs", "message_ack", true, "ack"],
    ["whaileys", "notify", false, "realtime"],
    ["whaileys", "notify", true, "outbound"],
    ["whaileys", "append", false, "history"],
    ["whaileys", "append", true, "history"],
    ["cloud_api", "messages", false, "realtime"],
    ["cloud_api", "messages", true, "outbound"],
    ["cloud_api", "smb_message_echoes", true, "echo"],
    ["cloud_api", "history", false, "history"],
    ["cloud_api", "statuses", true, "ack"]
  ] as Array<[MessageProvenanceProvider, string, boolean, MessageProvenanceKind]>)(
    "classifies %s/%s fromMe=%s as %s",
    (provider, event, fromMe, kind) => {
      expect(IdentifyMessageProvenance({ provider, event, fromMe })).toEqual({
        kind,
        provider
      });
    }
  );

  it.each(["wwebjs", "whaileys", "cloud_api", "unknown"] as const)(
    "never assumes realtime without event evidence for %s",
    provider => {
      expect(IdentifyMessageProvenance({ provider, fromMe: false }).kind).toBe(
        "unknown"
      );
      expect(
        IdentifyMessageProvenance({
          provider,
          event: "unproved",
          fromMe: false
        }).kind
      ).toBe("unknown");
    }
  );

  it.each([
    ["wwebjs", "message"],
    ["whaileys", "notify"],
    ["cloud_api", "messages"]
  ] as Array<[MessageProvenanceProvider, string]>)(
    "requires explicit inbound direction for %s/%s",
    (provider, event) => {
      expect(IdentifyMessageProvenance({ provider, event }).kind).toBe(
        "unknown"
      );
    }
  );

  it.each([undefined, null, {}, { messageProvenance: undefined }])(
    "resolves legacy context %j as unknown",
    context => {
      expect(ResolveMessageProvenance(context)).toEqual({
        kind: "unknown",
        provider: "unknown"
      });
    }
  );

  it.each([
    { kind: "realtime", provider: "unknown" },
    { kind: "unexpected", provider: "wwebjs" },
    { kind: "realtime", provider: "unexpected" }
  ])("fails closed for invalid metadata %j", value => {
    expect(
      ResolveMessageProvenance({
        messageProvenance: value as MessageProvenance
      })
    ).toEqual({ kind: "unknown", provider: "unknown" });
  });

  it("returns detached deterministic metadata without mutating context or evidence", () => {
    const evidence = Object.freeze({
      provider: "wwebjs" as const,
      event: "message",
      fromMe: false
    });
    const provenance = IdentifyMessageProvenance(evidence);
    const context = Object.freeze({
      whatsappId: 1,
      unreadMessages: 2,
      messageProvenance: Object.freeze(provenance)
    });
    const before = JSON.stringify(context);
    expect(IdentifyMessageProvenance(evidence)).toEqual(provenance);
    expect(ResolveMessageProvenance(context)).toEqual(provenance);
    expect(ResolveMessageProvenance(context)).not.toBe(provenance);
    expect(JSON.stringify(context)).toBe(before);
    expect(Object.keys(provenance)).toEqual(["kind", "provider"]);
  });

  it.each([
    "history",
    "echo",
    "outbound",
    "reconciliation",
    "ack",
    "unknown"
  ] as const)(
    "cannot give the future R07 decision commercial eligibility for %s",
    kind => {
      const provenance: CrmContactIntentContext["provenance"] =
        kind === "outbound" || kind === "reconciliation" ? "unknown" : kind;
      const decision = BuildCrmContactIntentService({
        contact: {
          id: 1,
          isGroup: false,
          number: "12025550123",
          phoneE164: "+12025550123"
        },
        resolution: "created",
        bindingStatus: "unknown",
        context: {
          channel: "whatsapp_inbound",
          provenance,
          fromMe: kind === "outbound",
          isGroup: false,
          authorized: true
        }
      });
      expect(decision.status).toBe("no_action");
      expect(decision.commercialOperation).toBe("not_requested");
      expect(decision.transport).toBe("not_released");
    }
  );

  it("preserves R07 group rejection even when the provider event is realtime", () => {
    const origin = IdentifyMessageProvenance({
      provider: "wwebjs",
      event: "message",
      fromMe: false
    });
    expect(origin.kind).toBe("realtime");
    const decision = BuildCrmContactIntentService({
      contact: {
        id: 1,
        isGroup: true,
        number: "12025550123",
        phoneE164: "+12025550123"
      },
      resolution: "created",
      bindingStatus: "unknown",
      context: {
        channel: "whatsapp_inbound",
        provenance: "realtime",
        fromMe: false,
        isGroup: true,
        authorized: true
      }
    });
    expect(decision).toMatchObject({
      status: "no_action",
      reason: "group",
      commercialOperation: "not_requested"
    });
  });
});
