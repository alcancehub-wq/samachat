import {
  BuildManualCreateContactSourceContext,
  BuildManualUpdateContactSourceContext,
  BuildRealtimeInboundContactSourceContext
} from "../BuildCrmM2mSourceContext";
import {
  LoadCrmIntegrationMapping
} from "../CrmIntegrationMappingService";

jest.mock("../CrmIntegrationMappingService", () => ({
  BuildCrmM2mIdentityFromMapping: jest.fn(() => ({
    integrationId: "synthetic-integration",
    organizationId: "00000000-0000-4000-8000-000000000001",
    sourceInstanceId: "synthetic-instance"
  })),
  LoadCrmIntegrationMapping: jest.fn()
}));

const loadMappingMock = LoadCrmIntegrationMapping as jest.MockedFunction<
  typeof LoadCrmIntegrationMapping
>;
let originalCaptureFlag: string | undefined;
let originalIntegrationId: string | undefined;

const mapping = {
  localIntegrationId: 7,
  identity: {
    integrationId: "synthetic-integration",
    organizationId: "00000000-0000-4000-8000-000000000001",
    sourceInstanceId: "synthetic-instance"
  },
  endpoint: "https://crm.example.test/m2m",
  approvedEndpoint: "https://crm.example.test/m2m",
  keyId: "synthetic-key",
  secretReference: "env:SAMACHAT_CRM_M2M_HMAC_SECRET",
  enabled: true,
  syncEnabled: true,
  commercialAdmissionEnabled: true,
  commercialPipelineName: "SDR",
  commercialStageName: "NOVO LEAD",
  commercialOwnerEmail: null,
  mappingVersion: 1
};

describe("CRM M2M source context gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    originalCaptureFlag = process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED;
    originalIntegrationId = process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID;
    process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED = "true";
    process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID = "7";
    loadMappingMock.mockResolvedValue(mapping);
  });

  afterEach(() => {
    if (originalCaptureFlag === undefined) {
      delete process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED;
    } else {
      process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED = originalCaptureFlag;
    }
    if (originalIntegrationId === undefined) {
      delete process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID;
    } else {
      process.env.SAMACHAT_CRM_M2M_INTEGRATION_ID = originalIntegrationId;
    }
  });

  it("builds authorized manual create and update contexts server-side", async () => {
    const created = await BuildManualCreateContactSourceContext({
      number: "+1 (202) 555-0101",
      isGroup: false
    });
    const updated = await BuildManualUpdateContactSourceContext({
      number: "12025550101",
      previousNumber: "12025550100",
      isGroup: false
    });

    expect(created?.context).toMatchObject({
      channel: "manual",
      provenance: "manual",
      authorized: true,
      fromMe: false,
      isGroup: false
    });
    expect(created?.phoneE164).toBe("+12025550101");

    expect(created?.commercialRequest).toEqual({
      enabled: true,
      pipeline_name: "SDR",
      stage_name: "NOVO LEAD",
      owner_email: null
    });

    expect(updated?.previousPhoneE164).toBe("+12025550100");
    expect(loadMappingMock).toHaveBeenCalledTimes(2);
  });

  it.each(["wwebjs", "whaileys", "cloud_api"] as const)(
    "allows realtime inbound provenance from %s",
    async provider => {
      const context = await BuildRealtimeInboundContactSourceContext({
        number: "12025550101",
        isGroup: false,
        fromMe: false,
        messageProvenance: { kind: "realtime", provider }
      });

      expect(context?.context).toMatchObject({
        channel: "whatsapp_inbound",
        provenance: "realtime",
        authorized: true,
        fromMe: false
      });
      expect(context?.metadata).toEqual({
        messageProvenance: { kind: "realtime", provider }
      });
    }
  );

  it.each([
    "history",
    "echo",
    "outbound",
    "reconciliation",
    "ack",
    "unknown"
  ] as const)("rejects %s provenance", async kind => {
    const context = await BuildRealtimeInboundContactSourceContext({
      number: "12025550101",
      isGroup: false,
      fromMe: false,
      messageProvenance: { kind, provider: "wwebjs" }
    });

    expect(context).toBeNull();
    expect(loadMappingMock).not.toHaveBeenCalled();
  });

  it("rejects groups, outbound messages, unknown providers, and unconfirmed phones", async () => {
    const group = await BuildRealtimeInboundContactSourceContext({
      number: "12025550101",
      isGroup: true,
      fromMe: false,
      messageProvenance: { kind: "realtime", provider: "wwebjs" }
    });
    const outbound = await BuildRealtimeInboundContactSourceContext({
      number: "12025550101",
      isGroup: false,
      fromMe: true,
      messageProvenance: { kind: "realtime", provider: "wwebjs" }
    });
    const unknownProvider = await BuildRealtimeInboundContactSourceContext({
      number: "12025550101",
      isGroup: false,
      fromMe: false,
      messageProvenance: { kind: "realtime", provider: "unknown" }
    });
    const unconfirmedPhone = await BuildRealtimeInboundContactSourceContext({
      number: "",
      isGroup: false,
      fromMe: false,
      messageProvenance: { kind: "realtime", provider: "wwebjs" }
    });

    expect([group, outbound, unknownProvider, unconfirmedPhone]).toEqual([
      null,
      null,
      null,
      null
    ]);
    expect(loadMappingMock).not.toHaveBeenCalled();
  });

  it("does not load mappings when capture is off or mapping is absent", async () => {
    process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED = "false";
    const disabled = await BuildManualCreateContactSourceContext({
      number: "12025550101",
      isGroup: false
    });
    expect(disabled).toBeNull();
    expect(loadMappingMock).not.toHaveBeenCalled();

    process.env.SAMACHAT_CRM_M2M_CAPTURE_ENABLED = "true";
    loadMappingMock.mockResolvedValueOnce(null);
    const unconfigured = await BuildManualCreateContactSourceContext({
      number: "12025550101",
      isGroup: false
    });
    expect(unconfigured).toBeNull();
  });
});
