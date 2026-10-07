import {
  GetCrmM2mCloserAvailability,
  ScheduleCrmM2mCloserMeeting
} from "../../../services/CrmIntegrationServices/CrmM2mCloserSchedulingService";
import type {
  CrmIntegrationMappingSnapshot
} from "../../../services/CrmIntegrationServices/CrmIntegrationMappingService";

const organizationId = "c40b0fc6-61ff-4d8d-9ce6-b8acefab7685";

const mapping: CrmIntegrationMappingSnapshot = {
  localIntegrationId: 10,
  identity: {
    integrationId: "samachat-crm-prod-v1",
    organizationId,
    sourceInstanceId: "samachat-prod"
  },
  endpoint: "https://example.com/functions/v1/samachat-m2m",
  approvedEndpoint: "https://example.com/functions/v1/samachat-m2m",
  keyId: "samachat-prod-v1",
  secretReference: "env:SAMACHAT_CRM_M2M_HMAC_SECRET",
  enabled: true,
  syncEnabled: true,
  commercialAdmissionEnabled: true,
  commercialPipelineName: "SDR",
  commercialStageName: "NOVO LEAD",
  commercialOwnerEmail: null,
  mappingVersion: 1
};

const baseDependencies = {
  loadMapping: async () => mapping,
  runtimeFlags: () => ({
    captureEnabled: false,
    deliveryEnabled: true,
    executorEnabled: false
  }),
  resolveSecret: async () => new Uint8Array(32).fill(1)
};

describe("CrmM2mCloserSchedulingService timestamp receipts", () => {
  it("accepts an equivalent UTC offset in closer availability receipt", async () => {
    const requestId = "11111111-1111-4111-8111-111111111111";
    const startAt = "2026-10-07T06:42:10.107Z";
    const endAt = "2026-10-07T07:42:10.107Z";

    const result = await GetCrmM2mCloserAvailability(
      {
        localIntegrationId: 10,
        requestId,
        startAt,
        endAt
      },
      {
        ...baseDependencies,
        transport: async () => ({
          status: 200,
          body: {
            schema_version: 1,
            organization_id: organizationId,
            start_at: "2026-10-07T06:42:10.107+00:00",
            end_at: "2026-10-07T07:42:10.107+00:00",
            available_closers: [
              {
                name: "Closer Test",
                email: "closer@example.com"
              }
            ]
          }
        })
      }
    );

    expect(result.state).toBe("available");
    expect(result.transportAccepted).toBe(true);
  });

  it("accepts an equivalent UTC offset in scheduled meeting receipt", async () => {
    const requestId = "22222222-2222-4222-8222-222222222222";
    const startAt = "2026-10-07T08:00:00.000Z";
    const endAt = "2026-10-07T09:00:00.000Z";

    const result = await ScheduleCrmM2mCloserMeeting(
      {
        localIntegrationId: 10,
        requestId,
        sourceContactId: 123,
        closerEmail: "closer@example.com",
        startAt,
        endAt,
        title: "Reuniao de teste"
      },
      {
        ...baseDependencies,
        transport: async () => ({
          status: 200,
          body: {
            status: "scheduled",
            reused: false,
            meeting_id: requestId,
            activity_event_id: null,
            root_deal_id: "33333333-3333-4333-8333-333333333333",
            opportunity_id: "44444444-4444-4444-8444-444444444444",
            route_id: "55555555-5555-4555-8555-555555555555",
            closer_name: "Closer Test",
            closer_email: "closer@example.com",
            start_at: "2026-10-07T08:00:00.000+00:00",
            end_at: "2026-10-07T09:00:00.000+00:00",
            handoff_ready: true,
            handoff_stage_name: "AGENDAMENTO",
            destination_pipeline_name: "CLOSER",
            destination_stage_name: "REUNIÃO AGENDADA"
          }
        })
      }
    );

    expect(result.state).toBe("scheduled");
    expect(result.transportAccepted).toBe(true);
  });
});
