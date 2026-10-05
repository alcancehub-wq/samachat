import { createHmac, randomBytes } from "crypto";
import { EventEmitter } from "events";
import AdaptCrmContactIntentService from "../AdaptCrmContactIntentService";
import { CrmContactIntentInput } from "../BuildCrmContactIntentService";
import {
  BuildCrmM2mEnvelope,
  BuildCrmM2mReceiptQuery,
  CrmM2mAttempt,
  ParseCrmM2mReceipt,
  SendCrmM2mAttempt
} from "../CrmM2mClient";

const input = (): CrmContactIntentInput => ({
  contact: {
    id: 1,
    isGroup: false,
    name: "Synthetic Contact",
    number: "12025550101",
    phoneE164: "+12025550101"
  },
  resolution: "created",
  bindingStatus: "not_linked",
  context: {
    channel: "whatsapp_inbound",
    provenance: "realtime",
    fromMe: false,
    isGroup: false,
    authorized: true
  }
});
const identity = {
  integrationId: "synthetic-integration",
  sourceInstanceId: "synthetic-instance",
  organizationId: "00000000-0000-4000-8000-000000000001"
};
const event = {
  id: "00000000-0000-4000-8000-000000000002",
  correlationId: "00000000-0000-4000-8000-000000000003",
  occurredAt: "2026-10-02T12:00:00.000Z",
  revision: 1
};
const context = {
  channel: "whatsapp_inbound" as const,
  provenance: "realtime" as const,
  from_me: false as const,
  is_group: false as const
};
const envelope = () =>
  BuildCrmM2mEnvelope(
    AdaptCrmContactIntentService(input(), {
      messageProvenance: { kind: "realtime", provider: "wwebjs" }
    }),
    identity,
    event,
    context
  )!;
const receipt = () => ({
  schema_version: 1,
  event_id: event.id,
  correlation_id: event.correlationId,
  organization_id: identity.organizationId,
  receipt_id: "00000000-0000-4000-8000-000000000004",
  processing_state: "processed",
  contact_result: {
    status: "created",
    crm_contact_id: "00000000-0000-4000-8000-000000000005",
    persisted_at: event.occurredAt
  },
  commercial_result: {
    status: "not_requested",
    primary_deal_id: null,
    opportunity_id: null
  },
  error: null
});
const attempt = (): CrmM2mAttempt => ({
  enabled: true,
  endpoint: "https://synthetic.invalid/samachat-m2m",
  approvedEndpoint: "https://synthetic.invalid/samachat-m2m",
  keyId: "ephemeral-key",
  secret: randomBytes(32),
  sentAt: event.occurredAt,
  clock: () => Date.parse(event.occurredAt),
  transport: jest.fn(async () => ({ status: 200, body: receipt() }))
});

describe("R08 to R07 pure adapter", () => {
  it.each([
    "history",
    "echo",
    "outbound",
    "reconciliation",
    "ack",
    "unknown"
  ] as const)("fails closed for %s", kind => {
    expect(
      AdaptCrmContactIntentService(input(), {
        messageProvenance: { kind, provider: "wwebjs" }
      }).status
    ).toBe("no_action");
  });
  it.each(["wwebjs", "whaileys", "cloud_api"] as const)(
    "accepts proven inbound %s without provider wiring",
    provider => {
      expect(
        AdaptCrmContactIntentService(input(), {
          messageProvenance: { kind: "realtime", provider }
        }).status
      ).toBe("candidate");
    }
  );
  it("absent metadata cannot claim realtime", () =>
    expect(AdaptCrmContactIntentService(input()).status).toBe("no_action"));
  it("groups, outbound, unauthorized and LID-only remain guarded", () => {
    const metadata = {
      messageProvenance: {
        kind: "realtime" as const,
        provider: "wwebjs" as const
      }
    };
    const value = input();
    expect(
      AdaptCrmContactIntentService(
        { ...value, contact: { ...value.contact, isGroup: true } },
        metadata
      ).status
    ).toBe("no_action");
    expect(
      AdaptCrmContactIntentService(
        { ...value, context: { ...value.context, fromMe: true } },
        metadata
      ).status
    ).toBe("no_action");
    expect(
      AdaptCrmContactIntentService(
        { ...value, context: { ...value.context, authorized: false } },
        metadata
      ).status
    ).toBe("no_action");
    expect(
      AdaptCrmContactIntentService(
        {
          ...value,
          contact: { ...value.contact, phoneE164: null, lid: "synthetic@lid" }
        },
        metadata
      ).status
    ).toBe("pending_identity");
  });
  it("manual path still requires explicit authorization", () => {
    const value = input();
    const manual = {
      ...value,
      context: {
        ...value.context,
        channel: "manual" as const,
        provenance: "manual" as const
      }
    };
    expect(AdaptCrmContactIntentService(manual).status).toBe("candidate");
    expect(
      AdaptCrmContactIntentService({
        ...manual,
        context: { ...manual.context, authorized: false }
      }).status
    ).toBe("no_action");
  });
});
describe("typed envelope and one-attempt delivery", () => {
  it("adapts registration without claiming commercial operation", () => {
    expect(envelope().data.registration.missing_fields).toBeInstanceOf(Array);
    expect(envelope().operation).toBe("upsert_contact");
    expect((envelope().data.registration as any).missingFields).toBeUndefined();
  });
  it("requires explicit UUID/org/revision and does not create events for no_action", () => {
    expect(
      BuildCrmM2mEnvelope(
        AdaptCrmContactIntentService(input()),
        identity,
        event,
        context
      )
    ).toBeNull();
    expect(() =>
      BuildCrmM2mEnvelope(
        AdaptCrmContactIntentService(input(), {
          messageProvenance: { kind: "realtime", provider: "wwebjs" }
        }),
        { ...identity, organizationId: "default" },
        event,
        context
      )
    ).toThrow();
  });
  it("disabled means no transport invocation", async () => {
    const config = attempt();
    expect(
      (await SendCrmM2mAttempt(envelope(), { ...config, enabled: false })).state
    ).toBe("disabled");
    expect(config.transport).not.toHaveBeenCalled();
  });
  it("v1 HMAC binds timestamp, event and unchanged raw body", async () => {
    const value = envelope();
    const config = attempt();
    expect((await SendCrmM2mAttempt(value, config)).state).toBe(
      "contact_confirmed"
    );
    const sent = (config.transport as jest.Mock).mock.calls[0][0];
    expect(sent.headers["X-SamaChat-Signature"]).toBe(
      createHmac("sha256", config.secret)
        .update(`${config.sentAt}\n${value.event_id}\n${sent.body}`)
        .digest("hex")
    );
    expect(sent.timeoutMs).toBe(8000);
    expect(sent.redirect).toBe("error");
    expect(config.transport).toHaveBeenCalledTimes(1);
  });
  it.each([200, 201, 202])(
    "HTTP %s without valid receipt never confirms persistence",
    async status => {
      expect(
        (
          await SendCrmM2mAttempt(envelope(), {
            ...attempt(),
            transport: async () => ({ status, body: {} })
          })
        ).state
      ).toBe("reconciliation_required");
    }
  );
  it.each([401, 403, 404, 409, 429, 500, 503])(
    "HTTP %s never retries implicitly",
    async status => {
      const transport = jest.fn(async () => ({ status, body: {} }));
      const result = await SendCrmM2mAttempt(envelope(), {
        ...attempt(),
        transport
      });
      expect(result.state).not.toBe("contact_confirmed");
      expect(transport).toHaveBeenCalledTimes(1);
    }
  );
  it("timeout is uncertain, not failed contact; authenticated query keeps original identity", async () => {
    const value = envelope();
    const transport = jest.fn(async () => {
      throw new Error("synthetic timeout");
    });
    expect(
      (await SendCrmM2mAttempt(value, { ...attempt(), transport })).state
    ).toBe("reconciliation_required");
    expect(transport).toHaveBeenCalledTimes(1);
    expect(BuildCrmM2mReceiptQuery(value)).toMatchObject({
      operation: "get_receipt",
      event_id: value.event_id,
      correlation_id: value.correlation_id
    });
  });
  it.each(["event_id", "organization_id", "correlation_id", "receipt_id"])(
    "rejects mismatched receipt %s",
    field => {
      expect(
        ParseCrmM2mReceipt({ ...receipt(), [field]: "invalid" }, envelope())
      ).toBeNull();
    }
  );
  it("rejects fake contact and unexpected commercial confirmation", () => {
    expect(
      ParseCrmM2mReceipt(
        {
          ...receipt(),
          contact_result: { ...receipt().contact_result, crm_contact_id: null }
        },
        envelope()
      )
    ).toBeNull();
    expect(
      ParseCrmM2mReceipt(
        {
          ...receipt(),
          commercial_result: {
            status: "created",
            primary_deal_id: "fake",
            opportunity_id: "fake"
          }
        },
        envelope()
      )
    ).toBeNull();
    expect(
      ParseCrmM2mReceipt(
        { ...receipt(), processing_state: "accepted" },
        envelope()
      )
    ).toBeNull();
  });
  it("unapproved/insecure endpoints are rejected before transport", async () => {
    const config = attempt();
    await expect(
      SendCrmM2mAttempt(envelope(), {
        ...config,
        endpoint: "http://synthetic.invalid"
      })
    ).rejects.toThrow();
    await expect(
      SendCrmM2mAttempt(envelope(), {
        ...config,
        endpoint: "https://other.invalid"
      })
    ).rejects.toThrow();
    expect(config.transport).not.toHaveBeenCalled();
  });
  it("retry caller retains the body and event while renewing signed timestamp", async () => {
    const value = envelope();
    const config = attempt();
    const body = JSON.stringify(value);
    await SendCrmM2mAttempt(value, config, body);
    await SendCrmM2mAttempt(
      value,
      { ...config, sentAt: "2026-10-02T12:00:01.000Z" },
      body
    );
    const calls = (config.transport as jest.Mock).mock.calls;
    expect(calls[0][0].body).toBe(calls[1][0].body);
    expect(calls[0][0].headers["X-SamaChat-Signature"]).not.toBe(
      calls[1][0].headers["X-SamaChat-Signature"]
    );
  });
  it("native HTTPS transport enforces one physical attempt and an 8-second deadline", async () => {
    jest.useFakeTimers();
    const physical = new EventEmitter() as any;
    physical.end = jest.fn();
    physical.destroy = jest.fn((error: Error) => {
      physical.emit("error", error);
      physical.emit("close");
    });
    const request = jest
      .spyOn(require("https"), "request")
      .mockReturnValue(physical);
    try {
      const pending = SendCrmM2mAttempt(envelope(), {
        ...attempt(),
        transport: undefined
      });
      jest.advanceTimersByTime(8000);
      expect((await pending).state).toBe("reconciliation_required");
      expect(request).toHaveBeenCalledTimes(1);
      expect(physical.destroy).toHaveBeenCalledTimes(1);
    } finally {
      request.mockRestore();
      jest.useRealTimers();
    }
  });
});
