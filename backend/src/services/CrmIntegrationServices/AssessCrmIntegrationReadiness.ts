import { QueryTypes, Sequelize } from "sequelize";
import {
  DeliveryCoordinatorConfiguration,
  ValidateCrmDeliveryConfiguration
} from "./CrmDeliveryCoordinator";
import { CrmM2mIdentity } from "./CrmM2mClient";
import VerifyContactSourceBridgeSchema, {
  ContactSourceBridgeTables,
  SourceBridgeTableMatches
} from "./VerifyContactSourceBridgeSchema";

type CheckState =
  | "PASS"
  | "PASS_LAB_ONLY"
  | "BLOCKED"
  | "DISABLED"
  | "NOT_VERIFIED"
  | "NOT_ENABLED"
  | "OUT_OF_SCOPE"
  | "FORBIDDEN";
export interface ReadinessCheck {
  readonly state: CheckState;
  readonly codes: readonly string[];
}
export interface CrmReadinessOptions {
  readonly enabled?: boolean;
  readonly scope?: "synthetic_lab";
  readonly authorizeAssessment?: () => boolean;
  readonly identity?: CrmM2mIdentity;
  readonly configuration?: DeliveryCoordinatorConfiguration;
  readonly clock?: () => Date;
  readonly database?: Sequelize;
  readonly targetDatabase?: string;
}
export interface CrmReadinessResult {
  readonly status:
    | "DISABLED"
    | "LAB_PREFLIGHT_PASS"
    | "LOCAL_PREFLIGHT_BLOCKED";
  readonly production: "PRODUCTION_NOT_VERIFIED";
  readonly productionActivationAuthorized: false;
  readonly productiveCapture: false;
  readonly productiveDeliveryEnabled: false;
  readonly matrix: {
    readonly LOCAL_SCHEMA: ReadinessCheck;
    readonly LOCAL_CONFIGURATION: ReadinessCheck;
    readonly IMMUTABILITY_GUARDS: ReadinessCheck;
    readonly M2M_REMOTE_DEPENDENCIES: ReadinessCheck;
    readonly PRODUCTIVE_CALLERS: ReadinessCheck;
    readonly COMMERCIAL_AUTHORIZATION: ReadinessCheck;
    readonly ACTIVATION_DECISION: ReadinessCheck;
  };
}
interface MetadataRow {
  [key: string]: unknown;
}
type ColumnContract = readonly [string, string, number?, boolean?];
const columns: Record<string, readonly ColumnContract[]> = {
  Contacts: [
    ["id", "int", undefined, false],
    ["name", "varchar", 255],
    ["number", "varchar", 255],
    ["lid", "varchar", 255],
    ["email", "varchar", 255],
    ["isGroup", "tinyint"],
    ["captureChannel", "varchar", 255],
    ["createdAt", "datetime", undefined, false],
    ["updatedAt", "datetime", undefined, false]
  ],
  ContactCustomFields: [
    ["id", "int", undefined, false],
    ["contactId", "int"],
    ["name", "varchar", 255],
    ["value", "varchar", 255],
    ["createdAt", "datetime", undefined, false],
    ["updatedAt", "datetime", undefined, false]
  ],
  ContactTags: [
    ["contactId", "int", undefined, false],
    ["tagId", "int", undefined, false],
    ["createdAt", "datetime", undefined, false],
    ["updatedAt", "datetime", undefined, false]
  ]
};
const primary: Record<string, readonly string[]> = {
  Contacts: ["id"],
  ContactCustomFields: ["id"],
  ContactTags: ["contactId", "tagId"]
};
const h01: {
  verify(query: { sequelize: Sequelize }): Promise<void>;
} = require("../../database/migrations/20261003125100-harden-crm-origin-immutability");

async function assessSchema(
  database: Sequelize,
  target: string
): Promise<ReadinessCheck> {
  const select = (sql: string) =>
    database.query<MetadataRow>(sql, {
      type: QueryTypes.SELECT,
      replacements: { target }
    });
  const identity = await select(
    "SELECT DATABASE() AS databaseName,@@lower_case_table_names AS caseMode"
  );
  if (identity.length !== 1 || identity[0].databaseName !== target)
    return { state: "BLOCKED", codes: ["SCHEMA_DATABASE_MISMATCH"] };
  const mode = Number(identity[0].caseMode);
  if (![0, 1, 2].includes(mode))
    return { state: "BLOCKED", codes: ["SCHEMA_CASE_MODE_UNSUPPORTED"] };
  const tables = await select(
    "SELECT TABLE_NAME AS tableName,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=:target"
  );
  const errors: string[] = [];
  for (const table of ContactSourceBridgeTables) {
    const row = tables.find(item =>
      SourceBridgeTableMatches(String(item.tableName), table, mode)
    );
    if (!row) errors.push(`SCHEMA_TABLE_MISSING:${table}`);
    else if (row.engine !== "InnoDB")
      errors.push(`SCHEMA_ENGINE_INCOMPATIBLE:${table}`);
  }
  if (errors.length) return { state: "BLOCKED", codes: errors };
  await VerifyContactSourceBridgeSchema(database);
  const fields = await select(
    "SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName,DATA_TYPE AS dataType,COLUMN_TYPE AS columnType,IS_NULLABLE AS nullable,CHARACTER_MAXIMUM_LENGTH AS maximumLength,COLLATION_NAME AS collationName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=:target"
  );
  for (const [table, required] of Object.entries(columns)) {
    for (const [name, type, length, nullable] of required) {
      const field = fields.find(
        row =>
          SourceBridgeTableMatches(String(row.tableName), table, mode) &&
          String(row.columnName).toLowerCase() === name.toLowerCase()
      );
      if (!field) errors.push(`SCHEMA_COLUMN_MISSING:${table}.${name}`);
      else if (
        field.dataType !== type ||
        (length !== undefined && Number(field.maximumLength) !== length) ||
        (nullable !== undefined &&
          field.nullable !== (nullable ? "YES" : "NO")) ||
        /unsigned/i.test(String(field.columnType))
      )
        errors.push(`SCHEMA_COLUMN_INCOMPATIBLE:${table}.${name}`);
    }
  }
  const indexes = await select(
    "SELECT TABLE_NAME AS tableName,INDEX_NAME AS indexName,NON_UNIQUE AS nonUnique,SEQ_IN_INDEX AS position,COLUMN_NAME AS columnName,SUB_PART AS prefixLength,INDEX_TYPE AS indexType FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=:target"
  );
  const checkIndex = (
    table: string,
    name: string,
    names: readonly string[],
    unique: boolean
  ) => {
    const rows = indexes
      .filter(
        row =>
          SourceBridgeTableMatches(String(row.tableName), table, mode) &&
          row.indexName === name
      )
      .sort((left, right) => Number(left.position) - Number(right.position));
    if (!rows.length) errors.push(`SCHEMA_INDEX_MISSING:${table}.${name}`);
    else if (
      rows.length !== names.length ||
      rows.some(
        (row, index) =>
          row.columnName !== names[index] ||
          Number(row.position) !== index + 1 ||
          Number(row.nonUnique) !== (unique ? 0 : 1) ||
          row.prefixLength !== null ||
          row.indexType !== "BTREE"
      )
    )
      errors.push(`SCHEMA_INDEX_INCOMPATIBLE:${table}.${name}`);
  };
  for (const [table, names] of Object.entries(primary))
    checkIndex(table, "PRIMARY", names, true);
  try {
    await h01.verify({ sequelize: database });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safe =
      /^H01_(?:SCHEMA_(?:IDENTITY_INVALID|TABLE_INVALID|COLUMNS_INVALID|COLUMN_INVALID|INDEX_INVALID)|TRIGGER_(?:MISSING_OR_UNEXPECTED|DEFINITION_INVALID)|PARTIAL_INSTALLATION_REQUIRES_WRITER_FREEZE|HARDENED_TRIGGERS_NOT_INSTALLED|PREEXISTING_CORRUPTION_REQUIRES_RECONCILIATION)(?::[A-Za-z0-9_.]+)?$/;
    errors.push(
      safe.test(message) ? message : "SCHEMA_H01_VERIFICATION_UNAVAILABLE"
    );
  }
  return {
    state: errors.length ? "BLOCKED" : "PASS",
    codes: errors.length
      ? errors
      : ["H01_SCHEMA_CONTRACT_MATCH", "H01_BYTE_EXACT_TRIGGERS_VERIFIED"]
  };
}

export default async function AssessCrmIntegrationReadiness(
  options: CrmReadinessOptions = {}
): Promise<CrmReadinessResult> {
  let schema: ReadinessCheck = {
    state: "DISABLED",
    codes: ["READINESS_DISABLED"]
  };
  let configuration: ReadinessCheck = schema;
  if (options.enabled === true) {
    configuration = {
      state: "BLOCKED",
      codes: ["READINESS_AUTHORIZATION_REQUIRED"]
    };
    schema = {
      state: "NOT_VERIFIED",
      codes: ["READINESS_CONFIGURATION_BLOCKED"]
    };
    try {
      if (options.scope !== "synthetic_lab")
        throw new Error("READINESS_LAB_SCOPE_REQUIRED");
      if (
        typeof options.authorizeAssessment !== "function" ||
        options.authorizeAssessment() !== true
      )
        throw new Error("READINESS_AUTHORIZATION_REQUIRED");
      if (!options.configuration)
        throw new Error("DELIVERY_CONFIGURATION_INVALID");
      ValidateCrmDeliveryConfiguration(
        options.identity!,
        options.configuration
      );
      if (typeof options.clock !== "function")
        throw new Error("DELIVERY_CLOCK_INVALID");
      const now = options.clock();
      if (!(now instanceof Date) || !Number.isFinite(+now))
        throw new Error("DELIVERY_CLOCK_INVALID");
      configuration = {
        state: "PASS_LAB_ONLY",
        codes: ["R13_CONFIGURATION_VALID", "ASSESSMENT_ONLY_AUTHORIZED"]
      };
    } catch (error) {
      const allowed = [
        "READINESS_LAB_SCOPE_REQUIRED",
        "READINESS_AUTHORIZATION_REQUIRED",
        "ORIGIN_IDENTITY_INVALID",
        "DELIVERY_SCOPE_INVALID",
        "DELIVERY_CONFIGURATION_INVALID",
        "DELIVERY_POLICY_INVALID",
        "DELIVERY_CLOCK_INVALID"
      ];
      const message = error instanceof Error ? error.message : "";
      configuration = {
        state: "BLOCKED",
        codes: [
          allowed.includes(message)
            ? message
            : "READINESS_CONFIGURATION_INVALID"
        ]
      };
    }
    if (configuration.state === "PASS_LAB_ONLY") {
      if (
        !options.database ||
        typeof options.targetDatabase !== "string" ||
        !/^[A-Za-z0-9_]{1,64}$/.test(options.targetDatabase)
      )
        schema = {
          state: "BLOCKED",
          codes: ["SCHEMA_EXPLICIT_DATABASE_REQUIRED"]
        };
      else {
        try {
          schema = await assessSchema(options.database, options.targetDatabase);
        } catch {
          schema = { state: "BLOCKED", codes: ["SCHEMA_METADATA_UNAVAILABLE"] };
        }
      }
    }
  }
  return {
    status:
      options.enabled !== true
        ? "DISABLED"
        : schema.state === "PASS" && configuration.state === "PASS_LAB_ONLY"
        ? "LAB_PREFLIGHT_PASS"
        : "LOCAL_PREFLIGHT_BLOCKED",
    production: "PRODUCTION_NOT_VERIFIED",
    productionActivationAuthorized: false,
    productiveCapture: false,
    productiveDeliveryEnabled: false,
    matrix: {
      LOCAL_SCHEMA: schema,
      LOCAL_CONFIGURATION: configuration,
      IMMUTABILITY_GUARDS: {
        state: schema.state,
        codes:
          schema.state === "PASS"
            ? ["H01_BYTE_EXACT_CONTRACT_VERIFIED_LAB_ONLY"]
            : schema.codes
      },
      M2M_REMOTE_DEPENDENCIES: {
        state: "NOT_VERIFIED",
        codes: [
          "GATEWAY_DEPLOYMENT",
          "TARGET_MIGRATIONS_PERMISSIONS",
          "AUTHORIZED_INTEGRATION_MAPPING",
          "SECRET_MANAGER_ROTATION",
          "TLS_TIMEOUT_CANCELLATION",
          "RATE_LIMIT",
          "RECEIPTS_OPERATIONAL_RECONCILIATION"
        ]
      },
      PRODUCTIVE_CALLERS: {
        state: "NOT_ENABLED",
        codes: ["NO_R15_CALLER_WIRING", "REPOSITORY_INSPECTION_ONLY"]
      },
      COMMERCIAL_AUTHORIZATION: {
        state: "OUT_OF_SCOPE",
        codes: ["ONE_DEAL_NOT_HOMOLOGATED", "SDR_NOT_HOMOLOGATED"]
      },
      ACTIVATION_DECISION: {
        state: "FORBIDDEN",
        codes: [
          "R15_NO_PRODUCTION_AUTHORITY",
          "HUMAN_ACTIVATION_AUTHORIZATION_REQUIRED"
        ]
      }
    }
  };
}
