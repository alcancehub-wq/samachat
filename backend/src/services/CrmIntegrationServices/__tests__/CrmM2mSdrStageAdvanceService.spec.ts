import {
  createHmac,
  randomBytes,
  randomUUID
} from "crypto";
import AdvanceCrmM2mSdrStage, {
  ParseCrmM2mSdrStageAdvanceReceipt
} from "../CrmM2mSdrStageAdvanceService";
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

const input = () => ({
  localIntegrationId: 7,
  requestId: randomUUID(),
  sourceContactId: 123,
  pipelineName: "SDR",
  fromStageName: "NOVO LEAD",
  toStageName: "PRIMEIRO CONTATO",
  reason: "automatic_sdr_progression"
});

const flags = () => ({
  captureEnabled: false,
  deliveryEnabled: true,
  executorEnabled: false
});

describe(
  "CRM M2M SDR stage advancement",
  () => {
    it(
      "stays completely off when delivery gate is disabled",
      async () => {
        const loadMapping = jest.fn(
          async () => mapping
        );

        const transport = jest.fn();

        const result =
          await AdvanceCrmM2mSdrStage(
            input(),
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
      "stays off when operational mapping is disabled",
      async () => {
        const transport = jest.fn();

        const result =
          await AdvanceCrmM2mSdrStage(
            input(),
            {
              runtimeFlags: flags,
              loadMapping: async () => ({
                ...mapping,
                enabled: false
              }),
              transport
            }
          );

        expect(result).toEqual({
          state: "disabled",
          transportAccepted: false,
          code: "mapping_disabled"
        });

        expect(
          transport
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects malformed movement before secret or transport",
      async () => {
        const resolveSecret =
          jest.fn(
            async () =>
              randomBytes(32)
          );

        const transport = jest.fn();

        const value = input();

        const result =
          await AdvanceCrmM2mSdrStage(
            {
              ...value,
              toStageName:
                value.fromStageName
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
      "signs stable request and accepts a valid moved receipt",
      async () => {
        const secret =
          randomBytes(32);

        const now =
          new Date(
            "2026-10-06T16:00:00.000Z"
          );

        const request =
          input();

        const rootDealId =
          randomUUID();

        const opportunityId =
          randomUUID();

        const routeId =
          randomUUID();

        const pipelineId =
          randomUUID();

        const fromStageId =
          randomUUID();

        const toStageId =
          randomUUID();

        const responsibleUserId =
          randomUUID();

        const transport =
          jest.fn(
            async (wire: any) => {
              const body =
                JSON.parse(
                  wire.body
                );

              expect(body).toMatchObject({
                schema_version: 1,
                request_id:
                  request.requestId,
                operation:
                  "advance_sdr_stage",
                integration_id:
                  mapping.identity
                    .integrationId,
                organization_id:
                  organizationId,
                source_system:
                  "samachat",
                source_instance_id:
                  mapping.identity
                    .sourceInstanceId,
                source_contact_id:
                  "123",
                pipeline_name:
                  "SDR",
                from_stage_name:
                  "NOVO LEAD",
                to_stage_name:
                  "PRIMEIRO CONTATO"
              });

              expect(
                wire.headers[
                  "X-SamaChat-Event-Id"
                ]
              ).toBe(
                request.requestId
              );

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
                    `${now.toISOString()}\n${request.requestId}\n${wire.body}`,
                    "utf8"
                  )
                  .digest("hex")
              );

              return {
                status: 200,
                body: {
                  status: "moved",
                  reused: false,
                  root_deal_id:
                    rootDealId,
                  opportunity_id:
                    opportunityId,
                  route_id:
                    routeId,
                  pipeline_id:
                    pipelineId,
                  from_stage_id:
                    fromStageId,
                  to_stage_id:
                    toStageId,
                  responsible_user_id:
                    responsibleUserId
                }
              };
            }
          );

        const result =
          await AdvanceCrmM2mSdrStage(
            request,
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

        expect(result).toEqual({
          state: "moved",
          transportAccepted: true,
          receipt: {
            status: "moved",
            reused: false,
            rootDealId,
            opportunityId,
            routeId,
            pipelineId,
            fromStageId,
            toStageId,
            responsibleUserId
          }
        });

        expect(
          transport
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "contains transport failures instead of propagating into SamaChat core",
      async () => {
        await expect(
          AdvanceCrmM2mSdrStage(
            input(),
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
                    "synthetic_transport_failure"
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
      "rejects malformed CRM receipt without touching core",
      () => {
        expect(
          ParseCrmM2mSdrStageAdvanceReceipt(
            {
              status: "moved",
              reused: false,
              root_deal_id:
                "invalid"
            }
          )
        ).toBeNull();
      }
    );
  }
);
