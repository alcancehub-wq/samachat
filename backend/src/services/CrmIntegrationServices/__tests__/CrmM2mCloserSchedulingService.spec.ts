import {
  createHmac,
  randomBytes,
  randomUUID
} from "crypto";
import {
  GetCrmM2mCloserAvailability,
  ParseCrmM2mScheduledMeetingReceipt,
  ScheduleCrmM2mCloserMeeting
} from "../CrmM2mCloserSchedulingService";
import {
  CrmIntegrationMappingSnapshot
} from "../CrmIntegrationMappingService";

const organizationId =
  "00000000-0000-4000-8000-000000000001";

const mapping:
  CrmIntegrationMappingSnapshot = {
    localIntegrationId: 7,
    identity: {
      integrationId:
        "samachat-crm-prod-v1",
      organizationId,
      sourceInstanceId:
        "synthetic-instance"
    },
    endpoint:
      "https://synthetic.invalid/samachat-m2m",
    approvedEndpoint:
      "https://synthetic.invalid/samachat-m2m",
    keyId: "synthetic-key",
    secretReference: "env:test",
    enabled: true,
    syncEnabled: true,
    commercialAdmissionEnabled: true,
    commercialPipelineName: "SDR",
    commercialStageName: "NOVO LEAD",
    commercialOwnerEmail: null,
    mappingVersion: 1
  };

const flags = () => ({
  captureEnabled: false,
  deliveryEnabled: true,
  executorEnabled: false
});

const startAt =
  "2026-10-12T18:00:00.000Z";

const endAt =
  "2026-10-12T18:30:00.000Z";

describe(
  "CRM M2M Closer scheduling",
  () => {
    it(
      "keeps availability completely off when delivery is disabled",
      async () => {
        const loadMapping =
          jest.fn(async () => mapping);

        const transport = jest.fn();

        const result =
          await GetCrmM2mCloserAvailability(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              startAt,
              endAt
            },
            {
              runtimeFlags: () => ({
                captureEnabled: false,
                deliveryEnabled: false,
                executorEnabled: false
              }),
              loadMapping,
              transport
            }
          );

        expect(result).toEqual({
          state: "disabled",
          transportAccepted: false,
          code: "delivery_disabled"
        });

        expect(
          loadMapping
        ).not.toHaveBeenCalled();

        expect(
          transport
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns available Closers from an authenticated signed request",
      async () => {
        const secret =
          randomBytes(32);

        const requestId =
          randomUUID();

        const now =
          new Date(
            "2026-10-06T17:00:00.000Z"
          );

        const transport =
          jest.fn(
            async (wire: any) => {
              const body =
                JSON.parse(wire.body);

              expect(body).toMatchObject({
                schema_version: 1,
                request_id: requestId,
                operation:
                  "get_closer_availability",
                start_at: startAt,
                end_at: endAt
              });

              expect(
                wire.headers[
                  "X-SamaChat-Signature"
                ]
              ).toBe(
                createHmac(
                  "sha256",
                  secret
                )
                  .update(
                    `${now.toISOString()}\n${requestId}\n${wire.body}`,
                    "utf8"
                  )
                  .digest("hex")
              );

              return {
                status: 200,
                body: {
                  schema_version: 1,
                  organization_id:
                    organizationId,
                  start_at: startAt,
                  end_at: endAt,
                  available_closers: [
                    {
                      name:
                        "Closer Sintético",
                      email:
                        "closer@example.test"
                    }
                  ]
                }
              };
            }
          );

        const result =
          await GetCrmM2mCloserAvailability(
            {
              localIntegrationId: 7,
              requestId,
              startAt,
              endAt
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret:
                async () => secret,
              transport,
              now: () => now
            }
          );

        expect(result.state)
          .toBe("available");

        if (result.state === "available") {
          expect(
            result.receipt.availableClosers
          ).toEqual([
            {
              name:
                "Closer Sintético",
              email:
                "closer@example.test"
            }
          ]);
        }
      }
    );

    it(
      "rejects malformed meeting before secret and transport",
      async () => {
        const resolveSecret =
          jest.fn(
            async () =>
              randomBytes(32)
          );

        const transport = jest.fn();

        const result =
          await ScheduleCrmM2mCloserMeeting(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              closerEmail: "invalid",
              startAt,
              endAt,
              title: "Reunião comercial",
              description: null
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret,
              transport
            }
          );

        expect(result).toEqual({
          state: "rejected",
          transportAccepted: false,
          code: "invalid_request"
        });

        expect(
          resolveSecret
        ).not.toHaveBeenCalled();

        expect(
          transport
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "accepts only a persisted meeting marked handoff ready",
      async () => {
        const requestId =
          randomUUID();

        const opportunityId =
          randomUUID();

        const routeId =
          randomUUID();

        const rootDealId =
          randomUUID();

        const activityEventId =
          randomUUID();

        const transport =
          jest.fn(
            async (wire: any) => {
              const body =
                JSON.parse(wire.body);

              expect(body).toMatchObject({
                operation:
                  "schedule_closer_meeting",
                request_id: requestId,
                source_contact_id: "123",
                closer_email:
                  "closer@example.test",
                start_at: startAt,
                end_at: endAt,
                title:
                  "Reunião comercial"
              });

              return {
                status: 200,
                body: {
                  status: "scheduled",
                  reused: false,
                  meeting_id: requestId,
                  activity_event_id:
                    activityEventId,
                  root_deal_id:
                    rootDealId,
                  opportunity_id:
                    opportunityId,
                  route_id:
                    routeId,
                  closer_name:
                    "Closer Sintético",
                  closer_email:
                    "closer@example.test",
                  start_at: startAt,
                  end_at: endAt,
                  handoff_ready: true,
                  handoff_stage_name:
                    "AGENDAMENTO",
                  destination_pipeline_name:
                    "CLOSER",
                  destination_stage_name:
                    "REUNIÃO AGENDADA"
                }
              };
            }
          );

        const result =
          await ScheduleCrmM2mCloserMeeting(
            {
              localIntegrationId: 7,
              requestId,
              sourceContactId: 123,
              closerEmail:
                "closer@example.test",
              startAt,
              endAt,
              title:
                "Reunião comercial",
              description:
                "Agendada pelo agente SDR"
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret:
                async () =>
                  randomBytes(32),
              transport
            }
          );

        expect(result.state)
          .toBe("scheduled");

        if (result.state === "scheduled") {
          expect(result.receipt).toMatchObject({
            meetingId: requestId,
            handoffReady: true,
            handoffStageName:
              "AGENDAMENTO",
            destinationPipelineName:
              "CLOSER",
            destinationStageName:
              "REUNIÃO AGENDADA"
          });
        }
      }
    );

    it(
      "returns conflict when selected Closer became unavailable before save",
      async () => {
        const result =
          await ScheduleCrmM2mCloserMeeting(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              closerEmail:
                "closer@example.test",
              startAt,
              endAt,
              title:
                "Reunião comercial"
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret:
                async () =>
                  randomBytes(32),
              transport:
                async () => ({
                  status: 409,
                  body: {
                    error:
                      "closer_schedule_conflict"
                  }
                })
            }
          );

        expect(result).toEqual({
          state: "conflict",
          transportAccepted: false,
          code:
            "closer_schedule_conflict"
        });
      }
    );

    it(
      "contains transport uncertainty and never throws into SamaChat core",
      async () => {
        await expect(
          ScheduleCrmM2mCloserMeeting(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              closerEmail:
                "closer@example.test",
              startAt,
              endAt,
              title:
                "Reunião comercial"
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret:
                async () =>
                  randomBytes(32),
              transport:
                async () => {
                  throw new Error(
                    "synthetic_failure"
                  );
                }
            }
          )
        ).resolves.toEqual({
          state:
            "reconciliation_required",
          transportAccepted: false,
          code: "transport_uncertain"
        });
      }
    );

    it(
      "rejects a success response that did not prove handoff readiness",
      async () => {
        const requestId =
          randomUUID();

        const result =
          await ScheduleCrmM2mCloserMeeting(
            {
              localIntegrationId: 7,
              requestId,
              sourceContactId: 123,
              closerEmail:
                "closer@example.test",
              startAt,
              endAt,
              title:
                "Reunião comercial"
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret:
                async () =>
                  randomBytes(32),
              transport:
                async () => ({
                  status: 200,
                  body: {
                    status: "scheduled",
                    reused: false,
                    meeting_id:
                      requestId,
                    root_deal_id:
                      randomUUID(),
                    opportunity_id:
                      randomUUID(),
                    route_id:
                      randomUUID(),
                    closer_name:
                      "Closer Sintético",
                    closer_email:
                      "closer@example.test",
                    start_at: startAt,
                    end_at: endAt,
                    handoff_ready: false
                  }
                })
            }
          );

        expect(result).toEqual({
          state:
            "reconciliation_required",
          transportAccepted: true,
          code:
            "invalid_schedule_receipt"
        });
      }
    );

    it(
      "parses idempotent reused schedule receipt without requiring a new activity event",
      () => {
        const receipt =
          ParseCrmM2mScheduledMeetingReceipt(
            {
              status: "scheduled",
              reused: true,
              meeting_id:
                randomUUID(),
              root_deal_id:
                randomUUID(),
              opportunity_id:
                randomUUID(),
              route_id:
                randomUUID(),
              closer_name:
                "Closer Sintético",
              closer_email:
                "closer@example.test",
              start_at: startAt,
              end_at: endAt,
              handoff_ready: true,
              handoff_stage_name:
                "AGENDAMENTO",
              destination_pipeline_name:
                "CLOSER",
              destination_stage_name:
                "REUNIÃO AGENDADA"
            }
          );

        expect(receipt)
          .not.toBeNull();

        expect(
          receipt?.activityEventId
        ).toBeNull();

        expect(receipt?.reused)
          .toBe(true);
      }
    );
  }
);
