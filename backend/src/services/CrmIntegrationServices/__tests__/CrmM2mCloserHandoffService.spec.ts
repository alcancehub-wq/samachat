import {
  createHmac,
  randomBytes,
  randomUUID
} from "crypto";
import {
  HandoffCrmM2mCloser,
  ParseCrmM2mCloserHandoffReceipt
} from "../CrmM2mCloserHandoffService";
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

describe(
  "CRM M2M Closer handoff",
  () => {
    it(
      "stays off before mapping when delivery is disabled",
      async () => {
        const loadMapping =
          jest.fn(async () => mapping);

        const transport = jest.fn();

        const result =
          await HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              meetingId: randomUUID()
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

        expect(loadMapping)
          .not.toHaveBeenCalled();

        expect(transport)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "sends an authenticated handoff tied to the persisted meeting",
      async () => {
        const secret =
          randomBytes(32);

        const requestId =
          randomUUID();

        const meetingId =
          randomUUID();

        const now =
          new Date(
            "2026-10-06T18:00:00.000Z"
          );

        const transport =
          jest.fn(
            async (wire: any) => {
              const body =
                JSON.parse(wire.body);

              expect(body).toEqual({
                schema_version: 1,
                request_id: requestId,
                operation:
                  "handoff_to_closer",
                integration_id:
                  mapping.identity.integrationId,
                organization_id:
                  organizationId,
                source_system:
                  "samachat",
                source_instance_id:
                  mapping.identity.sourceInstanceId,
                source_contact_id: "123",
                meeting_id: meetingId
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
                  status:
                    "handed_off",
                  reused: false,
                  meeting_id:
                    meetingId,
                  root_deal_id:
                    randomUUID(),
                  opportunity_id:
                    randomUUID(),
                  route_id:
                    randomUUID(),
                  event_id:
                    randomUUID(),
                  current_pipeline_id:
                    randomUUID(),
                  current_stage_id:
                    randomUUID(),
                  responsible_user_id:
                    randomUUID(),
                  delivered_by_user_id:
                    randomUUID()
                }
              };
            }
          );

        const result =
          await HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId,
              sourceContactId: 123,
              meetingId
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
          .toBe("handed_off");
      }
    );

    it(
      "rejects invalid meeting id before secret and transport",
      async () => {
        const resolveSecret =
          jest.fn(
            async () =>
              randomBytes(32)
          );

        const transport = jest.fn();

        const result =
          await HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              meetingId: "invalid"
            },
            {
              runtimeFlags: flags,
              loadMapping:
                async () => mapping,
              resolveSecret,
              transport
            }
          );

        expect(result.state)
          .toBe("rejected");

        expect(resolveSecret)
          .not.toHaveBeenCalled();

        expect(transport)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "maps a concurrent handoff to conflict",
      async () => {
        const result =
          await HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              meetingId: randomUUID()
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
                      "closer_handoff_conflict"
                  }
                })
            }
          );

        expect(result).toEqual({
          state: "conflict",
          transportAccepted: false,
          code:
            "closer_handoff_conflict"
        });
      }
    );

    it(
      "contains transport uncertainty",
      async () => {
        await expect(
          HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              meetingId: randomUUID()
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
                    "synthetic"
                  );
                }
            }
          )
        ).resolves.toMatchObject({
          state:
            "reconciliation_required",
          transportAccepted: false,
          code: "transport_uncertain"
        });
      }
    );

    it(
      "rejects success without a valid durable handoff receipt",
      async () => {
        const meetingId =
          randomUUID();

        const result =
          await HandoffCrmM2mCloser(
            {
              localIntegrationId: 7,
              requestId: randomUUID(),
              sourceContactId: 123,
              meetingId
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
                    status:
                      "handed_off",
                    reused: false,
                    meeting_id:
                      meetingId
                  }
                })
            }
          );

        expect(result).toEqual({
          state:
            "reconciliation_required",
          transportAccepted: true,
          code:
            "invalid_handoff_receipt"
        });
      }
    );

    it(
      "accepts exact idempotent reused receipt",
      () => {
        const receipt =
          ParseCrmM2mCloserHandoffReceipt({
            status: "handed_off",
            reused: true,
            meeting_id: randomUUID(),
            root_deal_id: randomUUID(),
            opportunity_id: randomUUID(),
            route_id: randomUUID(),
            event_id: randomUUID(),
            current_pipeline_id:
              randomUUID(),
            current_stage_id:
              randomUUID(),
            responsible_user_id:
              randomUUID()
          });

        expect(receipt)
          .not.toBeNull();

        expect(receipt?.reused)
          .toBe(true);
      }
    );
  }
);
