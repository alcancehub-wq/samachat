import CrmIntegrationMapping from "../../models/CrmIntegrationMapping";
import CrmOriginJournal from "../../models/CrmOriginJournal";
import { ReadCrmM2mRuntimeFlags } from "./CrmM2mRuntimeConfiguration";
import { GetCrmM2mDeliveryExecutorStatus } from "./CrmM2mDeliveryExecutor";
import {
  BuildCrmM2mIdentityFromMapping,
  LoadCrmIntegrationMapping
} from "./CrmIntegrationMappingService";

export interface CrmIntegrationRuntimeStatus {
  readonly integrationId: number;
  readonly configured: boolean;
  readonly mapping: null | {
    readonly m2mIntegrationId: string;
    readonly organizationId: string;
    readonly sourceInstanceId: string;
    readonly keyId: string;
    readonly mappingVersion: number;
    readonly m2mEnabled: boolean;
    readonly syncEnabled: boolean;
    readonly commercialAdmissionEnabled: boolean;
    readonly commercialPipelineName: string | null;
    readonly commercialStageName: string | null;
    readonly commercialOwnerEmail: string | null;
    readonly endpointConfigured: boolean;
    readonly secretReferenceConfigured: boolean;
  };
  readonly captureEnabled: boolean;
  readonly deliveryEnabled: boolean;
  readonly readiness:
    | "BLOCKED_SCHEMA"
    | "NOT_CONFIGURED"
    | "NOT_VERIFIED"
    | "E2E_CONFIRMED";
  readonly executor: {
    readonly enabled: boolean;
    readonly state: string;
    readonly lastTickAt: string | null;
    readonly lastResult: string | null;
    readonly lastErrorCode: string | null;
  };
  readonly lastProcessing: null | {
    readonly state: string;
    readonly processedAt: string;
    readonly receiptAt: string | null;
    readonly errorCode: string | null;
  };
}

const safeErrorCode = (value: unknown): string | null =>
  typeof value === "string" && /^[a-z][a-z0-9_]{0,99}$/i.test(value)
    ? value
    : value
    ? "technical_error"
    : null;

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export default async function ListCrmIntegrationRuntimeStatus(
  integrationIds: readonly number[]
): Promise<CrmIntegrationRuntimeStatus[]> {
  const mappingDatabase = CrmIntegrationMapping.sequelize;
  const journalDatabase = CrmOriginJournal.sequelize;
  if (!mappingDatabase || mappingDatabase !== journalDatabase) {
    throw new Error("CRM_M2M_READ_MODEL_DATABASE_UNAVAILABLE");
  }

  const tableNames = await mappingDatabase
    .getQueryInterface()
    .showAllTables();
  const mappingSchemaExists = tableNames.includes("CrmIntegrationMappings");
  const journalSchemaExists = tableNames.includes("CrmOriginJournals");
  const flags = ReadCrmM2mRuntimeFlags();
  const executor = GetCrmM2mDeliveryExecutorStatus();

  return Promise.all(
    integrationIds.map(async integrationId => {
      if (!mappingSchemaExists || !journalSchemaExists) {
        return {
          integrationId,
          configured: false,
          mapping: null,
          captureEnabled: flags.captureEnabled,
          deliveryEnabled: flags.deliveryEnabled,
          readiness: "BLOCKED_SCHEMA",
          executor: {
            enabled: flags.executorEnabled,
            state: executor.state,
            lastTickAt: executor.lastTickAt,
            lastResult: executor.lastResult,
            lastErrorCode: safeErrorCode(executor.lastErrorCode)
          },
          lastProcessing: null
        };
      }

      const loaded = await LoadCrmIntegrationMapping(integrationId);
      if (!loaded) {
        return {
          integrationId,
          configured: false,
          mapping: null,
          captureEnabled: flags.captureEnabled,
          deliveryEnabled: flags.deliveryEnabled,
          readiness: "NOT_CONFIGURED",
          executor: {
            enabled: flags.executorEnabled,
            state: executor.state,
            lastTickAt: executor.lastTickAt,
            lastResult: executor.lastResult,
            lastErrorCode: safeErrorCode(executor.lastErrorCode)
          },
          lastProcessing: null
        };
      }

      const identity = BuildCrmM2mIdentityFromMapping(loaded);
      const last = journalSchemaExists
        ? await CrmOriginJournal.findOne({
            where: {
              sourceInstanceId: identity.sourceInstanceId,
              integrationId: identity.integrationId,
              organizationId: identity.organizationId
            },
            attributes: [
              "state",
              "updatedAt",
              "receiptValidatedAt",
              "lastErrorCode"
            ],
            order: [
              ["updatedAt", "DESC"],
              ["eventId", "DESC"]
            ]
          })
        : null;
      const readiness = last?.state === "contact_confirmed"
        ? "E2E_CONFIRMED"
        : "NOT_VERIFIED";

      return {
        integrationId,
        configured: true,
        mapping: {
          m2mIntegrationId: identity.integrationId,
          organizationId: identity.organizationId,
          sourceInstanceId: identity.sourceInstanceId,
          keyId: loaded.keyId,
          mappingVersion: loaded.mappingVersion,
          m2mEnabled: loaded.enabled,
          syncEnabled: loaded.syncEnabled,
          commercialAdmissionEnabled:
            loaded.commercialAdmissionEnabled,
          commercialPipelineName:
            loaded.commercialPipelineName,
          commercialStageName:
            loaded.commercialStageName,
          commercialOwnerEmail:
            loaded.commercialOwnerEmail,
          endpointConfigured: Boolean(loaded.endpoint),
          secretReferenceConfigured: Boolean(loaded.secretReference)
        },
        captureEnabled:
          flags.captureEnabled &&
          loaded.enabled &&
          loaded.syncEnabled,
        deliveryEnabled:
          flags.deliveryEnabled &&
          loaded.enabled &&
          loaded.syncEnabled,
        readiness,
        executor: {
          enabled:
            flags.executorEnabled &&
            loaded.enabled &&
            loaded.syncEnabled,
          state: executor.state,
          lastTickAt: executor.lastTickAt,
          lastResult: executor.lastResult,
          lastErrorCode: safeErrorCode(executor.lastErrorCode)
        },
        lastProcessing: last
          ? {
              state: last.state,
              processedAt: toIsoString(last.updatedAt),
              receiptAt: last.receiptValidatedAt
                ? toIsoString(last.receiptValidatedAt)
                : null,
              errorCode: safeErrorCode(last.lastErrorCode)
            }
          : null
      };
    })
  );
}
