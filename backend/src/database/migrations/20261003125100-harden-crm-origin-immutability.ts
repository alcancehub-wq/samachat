import { QueryInterface, QueryTypes } from "sequelize";

type Metadata = Record<string, unknown>;
type Column = readonly [string, string, number?, boolean?];
const text = (name: string, length: number, nullable = false): Column => [
  name,
  "varchar",
  length,
  nullable
];
const date = (name: string): Column => [name, "datetime", undefined, false];
const journalText = [
  "eventId",
  "correlationId",
  "sourceInstanceId",
  "integrationId",
  "organizationId",
  "sourceContactId",
  "operation",
  "canonicalBody",
  "bodyHash",
  "semanticHash",
  "provenance",
  "provider",
  "occurredAt",
  "commercialOperation"
];
const journalFields = [
  "eventId",
  "correlationId",
  "sourceInstanceId",
  "integrationId",
  "organizationId",
  "sourceContactId",
  "sourceRevision",
  "operation",
  "schemaVersion",
  "canonicalBody",
  "bodyHash",
  "semanticHash",
  "provenance",
  "provider",
  "occurredAt",
  "commercialOperation",
  "createdAt"
];
const commandText = [
  "captureKey",
  "sourceInstanceId",
  "integrationId",
  "organizationId",
  "inputHash"
];
const commandFields = [...commandText, "createdAt"];
const columns: Record<string, readonly Column[]> = {
  CrmOriginJournals: [
    text("eventId", 36),
    text("correlationId", 36),
    text("sourceInstanceId", 100),
    text("integrationId", 100),
    text("organizationId", 36),
    text("sourceContactId", 20),
    ["sourceRevision", "bigint", undefined, false],
    text("operation", 40),
    ["schemaVersion", "int", undefined, false],
    ["canonicalBody", "text", undefined, false],
    text("bodyHash", 64),
    text("semanticHash", 64),
    text("provenance", 30),
    text("provider", 30),
    text("occurredAt", 24),
    text("state", 40),
    ["stateVersion", "int", undefined, false],
    ["attemptCount", "int", undefined, false],
    text("attemptId", 36, true),
    text("leaseExpiresAt", 24, true),
    text("transportAcceptedAt", 24, true),
    text("receiptValidatedAt", 24, true),
    text("contactConfirmedAt", 24, true),
    ["receipt", "text", undefined, true],
    text("lastErrorCode", 100, true),
    text("commercialOperation", 30),
    date("createdAt"),
    date("updatedAt")
  ],
  CrmOriginCaptureCommands: [
    text("captureKey", 36),
    text("sourceInstanceId", 100),
    text("integrationId", 100),
    text("organizationId", 36),
    text("inputHash", 64),
    ["outcome", "text", undefined, true],
    date("createdAt"),
    date("updatedAt")
  ]
};
const equal = (field: string, binary: boolean) =>
  binary
    ? `CAST(NEW.${field} AS BINARY) <=> CAST(OLD.${field} AS BINARY)`
    : `NEW.${field} <=> OLD.${field}`;
const conditions = (
  fields: readonly string[],
  textual: readonly string[],
  hardened: boolean
) =>
  fields
    .map(field => `NOT (${equal(field, hardened && textual.includes(field))})`)
    .join(" OR ");
function contracts(hardened: boolean) {
  return [
    {
      name: "crm_origin_journal_immutable",
      table: "CrmOriginJournals",
      body: `BEGIN IF ${conditions(
        journalFields,
        journalText,
        hardened
      )} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ORIGIN_JOURNAL_IMMUTABLE'; END IF; END`
    },
    {
      name: "crm_origin_command_immutable",
      table: "CrmOriginCaptureCommands",
      body: `BEGIN IF ${conditions(
        commandFields,
        commandText,
        hardened
      )} OR (OLD.outcome IS NOT NULL AND NOT (${equal(
        "outcome",
        hardened
      )})) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ORIGIN_COMMAND_IMMUTABLE'; END IF; END`
    }
  ];
}
const normalized = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
async function inspect(
  query: QueryInterface
): Promise<"original" | "hardened"> {
  const select = (sql: string) =>
    query.sequelize.query<Metadata>(sql, { type: QueryTypes.SELECT });
  const identity = await select(
    "SELECT DATABASE() AS databaseName,@@lower_case_table_names AS caseMode"
  );
  if (
    identity.length !== 1 ||
    typeof identity[0].databaseName !== "string" ||
    !identity[0].databaseName ||
    ![0, 1, 2].includes(Number(identity[0].caseMode))
  )
    throw new Error("H01_SCHEMA_IDENTITY_INVALID");
  const caseMode = Number(identity[0].caseMode);
  const matches = (actual: unknown, expected: string) =>
    [1, 2].includes(caseMode)
      ? String(actual).toLowerCase() === expected.toLowerCase()
      : actual === expected;
  const tables = await select(
    "SELECT TABLE_NAME AS tableName,ENGINE AS engine,TABLE_COLLATION AS collationName FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
  );
  const fields = await select(
    "SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName,DATA_TYPE AS dataType,COLUMN_TYPE AS columnType,IS_NULLABLE AS nullable,CHARACTER_MAXIMUM_LENGTH AS maximumLength,COLLATION_NAME AS collationName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()"
  );
  for (const [table, required] of Object.entries(columns)) {
    const row = tables.find(item => matches(item.tableName, table));
    if (!row || row.engine !== "InnoDB" || row.collationName !== "utf8mb4_bin")
      throw new Error(`H01_SCHEMA_TABLE_INVALID:${table}`);
    const actual = fields.filter(item => matches(item.tableName, table));
    if (actual.length !== required.length)
      throw new Error(`H01_SCHEMA_COLUMNS_INVALID:${table}`);
    for (const [name, type, length, nullable] of required) {
      const column = actual.find(item => item.columnName === name);
      if (
        !column ||
        column.dataType !== type ||
        /unsigned/i.test(String(column.columnType)) ||
        (length !== undefined && Number(column.maximumLength) !== length) ||
        column.nullable !== (nullable ? "YES" : "NO") ||
        (["text", "varchar"].includes(type) &&
          column.collationName !== "utf8mb4_bin")
      )
        throw new Error(`H01_SCHEMA_COLUMN_INVALID:${table}.${name}`);
    }
  }
  const indexes = await select(
    "SELECT TABLE_NAME AS tableName,INDEX_NAME AS indexName,NON_UNIQUE AS nonUnique,SEQ_IN_INDEX AS position,COLUMN_NAME AS columnName,SUB_PART AS prefixLength,INDEX_TYPE AS indexType FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()"
  );
  for (const [table, name, names, unique] of [
    ["CrmOriginJournals", "PRIMARY", ["eventId"], true],
    ["CrmOriginCaptureCommands", "PRIMARY", ["captureKey"], true],
    [
      "CrmOriginJournals",
      "crm_origin_identity_revision_unique",
      ["sourceInstanceId", "sourceContactId", "sourceRevision"],
      true
    ],
    [
      "CrmOriginJournals",
      "crm_origin_pending_scope",
      ["sourceInstanceId", "integrationId", "organizationId", "state"],
      false
    ]
  ] as const) {
    const rows = indexes
      .filter(row => matches(row.tableName, table) && row.indexName === name)
      .sort((left, right) => Number(left.position) - Number(right.position));
    if (
      rows.length !== names.length ||
      rows.some(
        (row, position) =>
          row.columnName !== names[position] ||
          Number(row.position) !== position + 1 ||
          Number(row.nonUnique) !== (unique ? 0 : 1) ||
          row.prefixLength !== null ||
          row.indexType !== "BTREE"
      )
    )
      throw new Error(`H01_SCHEMA_INDEX_INVALID:${name}`);
  }
  const triggers = await select(
    "SELECT TRIGGER_NAME AS name,EVENT_OBJECT_TABLE AS tableName,ACTION_TIMING AS timing,EVENT_MANIPULATION AS event,ACTION_ORIENTATION AS orientation,ACTION_STATEMENT AS statement FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()"
  );
  const states: string[] = [];
  for (const [position, contract] of contracts(false).entries()) {
    const onTable = triggers.filter(row =>
      matches(row.tableName, contract.table)
    );
    const trigger = onTable.find(row => row.name === contract.name);
    if (
      onTable.length !== 1 ||
      !trigger ||
      trigger.timing !== "BEFORE" ||
      trigger.event !== "UPDATE" ||
      trigger.orientation !== "ROW"
    )
      throw new Error(`H01_TRIGGER_MISSING_OR_UNEXPECTED:${contract.name}`);
    if (normalized(trigger.statement) === normalized(contract.body))
      states.push("original");
    else if (
      normalized(trigger.statement) ===
      normalized(contracts(true)[position].body)
    )
      states.push("hardened");
    else throw new Error(`H01_TRIGGER_DEFINITION_INVALID:${contract.name}`);
  }
  if (states[0] !== states[1])
    throw new Error("H01_PARTIAL_INSTALLATION_REQUIRES_WRITER_FREEZE");
  return states[0] as "original" | "hardened";
}
async function verifyData(query: QueryInterface): Promise<void> {
  const rows = await query.sequelize.query<{ invalid: unknown }>(
    `SELECT
    (SELECT COUNT(*) FROM CrmOriginJournals WHERE NOT (CAST(bodyHash AS BINARY) <=> CAST(SHA2(canonicalBody,256) AS BINARY)) OR JSON_VALID(canonicalBody)<>1 OR (receipt IS NOT NULL AND JSON_VALID(receipt)<>1) OR sourceRevision<1 OR schemaVersion<>1 OR stateVersion<0 OR attemptCount<0 OR commercialOperation<>'not_requested') +
    (SELECT COUNT(*) FROM CrmOriginCaptureCommands WHERE (outcome IS NOT NULL AND JSON_VALID(outcome)<>1)) AS invalid`,
    { type: QueryTypes.SELECT }
  );
  if (rows.length !== 1 || Number(rows[0].invalid) !== 0)
    throw new Error("H01_PREEXISTING_CORRUPTION_REQUIRES_RECONCILIATION");
}
async function verify(query: QueryInterface): Promise<void> {
  if ((await inspect(query)) !== "hardened")
    throw new Error("H01_HARDENED_TRIGGERS_NOT_INSTALLED");
  await verifyData(query);
}
module.exports = {
  up: async (query: QueryInterface) => {
    const state = await inspect(query);
    await verifyData(query);
    if (state === "hardened") {
      await verify(query);
      return;
    }
    try {
      for (const contract of contracts(true)) {
        await query.sequelize.query(`DROP TRIGGER ${contract.name}`);
        await query.sequelize.query(
          `CREATE TRIGGER ${contract.name} BEFORE UPDATE ON ${contract.table} FOR EACH ROW ${contract.body}`
        );
      }
      await verify(query);
    } catch {
      throw new Error("H01_DDL_OR_POSTCHECK_FAILED_REQUIRES_WRITER_FREEZE");
    }
  },
  verify,
  down: async () => {
    throw new Error("H01_AUTOMATIC_ROLLBACK_FORBIDDEN");
  }
};
