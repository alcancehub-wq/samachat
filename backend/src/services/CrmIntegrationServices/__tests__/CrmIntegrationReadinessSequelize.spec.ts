import { createHash, randomBytes, randomUUID } from "crypto";
import http from "http";
import https from "https";
import { QueryTypes } from "sequelize";
import AssessCrmIntegrationReadiness, {
  CrmReadinessOptions
} from "../AssessCrmIntegrationReadiness";
import {
  InitializeCrmReadinessLab,
  ReadinessLab,
  readinessDatabaseName
} from "./fixtures/CrmReadinessLab";

let lab: ReadinessLab;
const identity = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  integrationId: "synthetic-integration",
  sourceInstanceId: "synthetic-instance"
};
const transport = jest.fn(async () => {
  throw new Error("R15_TRANSPORT_FORBIDDEN");
});
function options(): CrmReadinessOptions {
  return {
    enabled: true,
    scope: "synthetic_lab",
    authorizeAssessment: () => true,
    identity,
    configuration: {
      enabled: false,
      identity,
      m2m: {
        endpoint: "https://synthetic.invalid/m2m",
        approvedEndpoint: "https://synthetic.invalid/m2m",
        keyId: "ephemeral-key",
        secret: randomBytes(32)
      },
      transport
    },
    clock: () => new Date("2026-10-03T15:00:00.000Z"),
    database: lab.diagnostic,
    targetDatabase: readinessDatabaseName
  };
}
beforeAll(async () => {
  lab = await InitializeCrmReadinessLab();
});
beforeEach(async () => {
  jest.spyOn(http, "request").mockImplementation(() => {
    throw new Error("R15_HTTP_FORBIDDEN");
  });
  jest.spyOn(https, "request").mockImplementation(() => {
    throw new Error("R15_HTTPS_FORBIDDEN");
  });
  transport.mockClear();
  await lab.restore();
  lab.statements.length = 0;
});
afterEach(() => {
  expect(transport).not.toHaveBeenCalled();
  expect(http.request).not.toHaveBeenCalled();
  expect(https.request).not.toHaveBeenCalled();
  expect(lab.statements.every(sql => /^SELECT\b/.test(sql))).toBe(true);
  jest.restoreAllMocks();
});
afterAll(async () => {
  if (lab) await lab.close();
});
it("A original R10 is rejected and historical PAD SPACE witness remains negative", async () => {
  await lab.restore(false);
  lab.statements.length = 0;
  const result = await AssessCrmIntegrationReadiness(options());
  expect(result.matrix.LOCAL_SCHEMA.state).toBe("BLOCKED");
  expect(result.matrix.LOCAL_SCHEMA.codes).toContain(
    "H01_HARDENED_TRIGGERS_NOT_INSTALLED"
  );
  expect(result.status).toBe("LOCAL_PREFLIGHT_BLOCKED");
  expect(result.matrix.LOCAL_CONFIGURATION.state).toBe("PASS_LAB_ONLY");
  expect(result.production).toBe("PRODUCTION_NOT_VERIFIED");
  expect(result.productionActivationAuthorized).toBe(false);
  expect(result.productiveCapture).toBe(false);
  expect(result.productiveDeliveryEnabled).toBe(false);
  expect(result.matrix.M2M_REMOTE_DEPENDENCIES.state).toBe("NOT_VERIFIED");
  expect(result.matrix.ACTIVATION_DECISION.state).toBe("FORBIDDEN");
  expect(result.matrix.COMMERCIAL_AUTHORIZATION.state).toBe("OUT_OF_SCOPE");
  const eventId = await seedJournal();
  const before = await lab.bytes("CrmOriginJournals", eventId);
  await lab.mutate(
    "UPDATE CrmOriginJournals SET canonicalBody=CONCAT(canonicalBody,' ') WHERE eventId=:eventId",
    { eventId }
  );
  const after = await lab.bytes("CrmOriginJournals", eventId);
  expect(after.canonicalBody).toBe(`${before.canonicalBody}20`);
  expect(after.bodyHash).toBe(before.bodyHash);
  const rows = await lab.database.query<{ invalid: number }>(
    "SELECT COUNT(*) AS invalid FROM CrmOriginJournals WHERE SHA2(canonicalBody,256)<>bodyHash",
    { type: require("sequelize").QueryTypes.SELECT }
  );
  expect(Number(rows[0].invalid)).toBe(1);
});

async function seedJournal(): Promise<string> {
  const eventId = randomUUID();
  const correlationId = randomUUID();
  const body = JSON.stringify({
    schema_version: 1,
    event_id: eventId,
    correlation_id: correlationId,
    source_system: "samachat",
    source_instance_id: identity.sourceInstanceId,
    integration_id: identity.integrationId,
    organization_id: identity.organizationId,
    operation: "upsert_contact",
    source_contact_id: "1",
    source_revision: 1
  });
  const bodyHash = createHash("sha256").update(body).digest("hex");
  await lab.mutate(
    `INSERT INTO CrmOriginJournals
    (eventId,correlationId,sourceInstanceId,integrationId,organizationId,sourceContactId,sourceRevision,operation,schemaVersion,canonicalBody,bodyHash,semanticHash,provenance,provider,occurredAt,state,stateVersion,attemptCount,commercialOperation,createdAt,updatedAt)
    VALUES (:eventId,:correlationId,:instance,:integration,:org,'1',1,'upsert_contact',1,:body,:bodyHash,:bodyHash,'manual','unknown','2026-10-03T15:00:00.000Z','intent_persisted',0,0,'not_requested',NOW(),NOW())`,
    {
      eventId,
      correlationId,
      instance: identity.sourceInstanceId,
      integration: identity.integrationId,
      org: identity.organizationId,
      body,
      bodyHash
    }
  );
  return eventId;
}

it("effective byte immutability rejects trailing whitespace in canonicalBody", async () => {
  const eventId = await seedJournal();
  const before = await lab.bytes("CrmOriginJournals", eventId);
  const body = Buffer.from(String(before.canonicalBody), "hex").toString(
    "utf8"
  );
  await expect(
    lab.mutate(
      "UPDATE CrmOriginJournals SET canonicalBody=:changed WHERE eventId=:eventId",
      { changed: `${body} `, eventId }
    )
  ).rejects.toMatchObject({ original: { sqlState: "45000" } });
  expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
  const captureKey = randomUUID();
  await lab.mutate(
    "INSERT INTO CrmOriginCaptureCommands(captureKey,sourceInstanceId,integrationId,organizationId,inputHash,outcome,createdAt,updatedAt) VALUES(:captureKey,:instance,:integration,:org,:hash,NULL,NOW(),NOW())",
    {
      captureKey,
      instance: identity.sourceInstanceId,
      integration: identity.integrationId,
      org: identity.organizationId,
      hash: "a".repeat(64)
    }
  );
  await lab.mutate(
    "UPDATE CrmOriginCaptureCommands SET outcome=:outcome WHERE captureKey=:captureKey",
    {
      outcome: JSON.stringify({ source: "committed", contactId: 1 }),
      captureKey
    }
  );
  const command = await lab.bytes("CrmOriginCaptureCommands", captureKey);
  await expect(
    lab.mutate(
      "UPDATE CrmOriginCaptureCommands SET outcome=CONCAT(outcome,' ') WHERE captureKey=:captureKey",
      { captureKey }
    )
  ).rejects.toMatchObject({ original: { sqlState: "45000" } });
  expect(await lab.bytes("CrmOriginCaptureCommands", captureKey)).toEqual(
    command
  );
});

it("C H01 known contract yields LAB_PREFLIGHT_PASS without production authority", async () => {
  const result = await AssessCrmIntegrationReadiness(options());
  expect(result.status).toBe("LAB_PREFLIGHT_PASS");
  expect(result.matrix.LOCAL_SCHEMA.state).toBe("PASS");
  expect(result.matrix.IMMUTABILITY_GUARDS.state).toBe("PASS");
  expect(result.matrix.LOCAL_CONFIGURATION.state).toBe("PASS_LAB_ONLY");
  expect(result.production).toBe("PRODUCTION_NOT_VERIFIED");
  expect(result.productionActivationAuthorized).toBe(false);
  expect(result.productiveCapture).toBe(false);
  expect(result.productiveDeliveryEnabled).toBe(false);
  expect(result.matrix.M2M_REMOTE_DEPENDENCIES.state).toBe("NOT_VERIFIED");
  expect(result.matrix.COMMERCIAL_AUTHORIZATION.state).toBe("OUT_OF_SCOPE");
  expect(result.matrix.PRODUCTIVE_CALLERS.state).toBe("NOT_ENABLED");
  expect(result.matrix.ACTIVATION_DECISION.state).toBe("FORBIDDEN");
});

async function blocked(code: string): Promise<void> {
  const result = await AssessCrmIntegrationReadiness(options());
  expect(result.status).toBe("LOCAL_PREFLIGHT_BLOCKED");
  expect(result.matrix.LOCAL_SCHEMA.state).toBe("BLOCKED");
  expect(result.matrix.LOCAL_SCHEMA.codes).toContain(code);
  expect(result.matrix.IMMUTABILITY_GUARDS.state).not.toBe("PASS");
  expect(result.productionActivationAuthorized).toBe(false);
  expect(result.productiveCapture).toBe(false);
  expect(result.productiveDeliveryEnabled).toBe(false);
  expect(result.matrix.M2M_REMOTE_DEPENDENCIES.state).toBe("NOT_VERIFIED");
}
it.each([
  "Contacts",
  "ContactCustomFields",
  "ContactTags",
  "CrmOriginJournals",
  "CrmOriginCaptureCommands"
])("missing table %s blocks without repair", async table => {
  await lab.mutate(`DROP TABLE ${table}`);
  await blocked(`SCHEMA_TABLE_MISSING:${table}`);
});
it.each([
  "Contacts",
  "ContactCustomFields",
  "ContactTags",
  "CrmOriginJournals",
  "CrmOriginCaptureCommands"
])("MyISAM table %s blocks", async table => {
  if (table === "CrmOriginJournals")
    await lab.mutate(
      "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_pending_scope"
    );
  await lab.mutate(`ALTER TABLE ${table} ENGINE=MyISAM`);
  await blocked(`SCHEMA_ENGINE_INCOMPATIBLE:${table}`);
});
it.each([
  [
    "source column missing",
    "ALTER TABLE Contacts DROP COLUMN captureChannel",
    "SCHEMA_COLUMN_MISSING:Contacts.captureChannel"
  ],
  [
    "journal column missing",
    "ALTER TABLE CrmOriginJournals DROP COLUMN lastErrorCode",
    "H01_SCHEMA_COLUMNS_INVALID:CrmOriginJournals"
  ],
  [
    "command column missing",
    "ALTER TABLE CrmOriginCaptureCommands DROP COLUMN updatedAt",
    "H01_SCHEMA_COLUMNS_INVALID:CrmOriginCaptureCommands"
  ],
  [
    "type",
    "ALTER TABLE CrmOriginJournals MODIFY attemptCount BIGINT NOT NULL",
    "H01_SCHEMA_COLUMN_INVALID:CrmOriginJournals.attemptCount"
  ],
  [
    "size",
    "ALTER TABLE CrmOriginCaptureCommands MODIFY inputHash VARCHAR(63) NOT NULL",
    "H01_SCHEMA_COLUMN_INVALID:CrmOriginCaptureCommands.inputHash"
  ],
  [
    "nullability",
    "ALTER TABLE CrmOriginJournals MODIFY attemptCount INT NULL",
    "H01_SCHEMA_COLUMN_INVALID:CrmOriginJournals.attemptCount"
  ],
  [
    "signedness",
    "ALTER TABLE CrmOriginJournals MODIFY attemptCount INT UNSIGNED NOT NULL",
    "H01_SCHEMA_COLUMN_INVALID:CrmOriginJournals.attemptCount"
  ],
  [
    "source type",
    "ALTER TABLE Contacts MODIFY name TEXT",
    "SCHEMA_COLUMN_INCOMPATIBLE:Contacts.name"
  ],
  [
    "journal PK missing",
    "ALTER TABLE CrmOriginJournals DROP PRIMARY KEY",
    "H01_SCHEMA_INDEX_INVALID:PRIMARY"
  ],
  [
    "command PK missing",
    "ALTER TABLE CrmOriginCaptureCommands DROP PRIMARY KEY",
    "H01_SCHEMA_INDEX_INVALID:PRIMARY"
  ],
  [
    "source PK order",
    "ALTER TABLE ContactTags DROP PRIMARY KEY,ADD PRIMARY KEY(tagId,contactId)",
    "SCHEMA_INDEX_INCOMPATIBLE:ContactTags.PRIMARY"
  ],
  [
    "revision index missing",
    "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_identity_revision_unique",
    "H01_SCHEMA_INDEX_INVALID:crm_origin_identity_revision_unique"
  ],
  [
    "pending index missing",
    "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_pending_scope",
    "H01_SCHEMA_INDEX_INVALID:crm_origin_pending_scope"
  ]
] as const)("incompatible %s blocks", async (_name, sql, code) => {
  await lab.mutate(sql);
  await blocked(code);
});
it.each([
  [
    "order",
    "CREATE UNIQUE INDEX crm_origin_identity_revision_unique ON CrmOriginJournals(sourceContactId,sourceInstanceId,sourceRevision)"
  ],
  [
    "uniqueness",
    "CREATE INDEX crm_origin_identity_revision_unique ON CrmOriginJournals(sourceInstanceId,sourceContactId,sourceRevision)"
  ],
  [
    "prefix",
    "CREATE UNIQUE INDEX crm_origin_identity_revision_unique ON CrmOriginJournals(sourceInstanceId(8),sourceContactId,sourceRevision)"
  ],
  [
    "composition",
    "CREATE UNIQUE INDEX crm_origin_identity_revision_unique ON CrmOriginJournals(sourceInstanceId,sourceRevision)"
  ]
] as const)("revision index %s blocks", async (_name, sql) => {
  await lab.mutate(
    "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_identity_revision_unique"
  );
  await lab.mutate(sql);
  await blocked("H01_SCHEMA_INDEX_INVALID:crm_origin_identity_revision_unique");
});
it("pending index order blocks", async () => {
  await lab.mutate(
    "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_pending_scope"
  );
  await lab.mutate(
    "CREATE INDEX crm_origin_pending_scope ON CrmOriginJournals(integrationId,sourceInstanceId,organizationId,state)"
  );
  await blocked("H01_SCHEMA_INDEX_INVALID:crm_origin_pending_scope");
});
it.each(["crm_origin_journal_immutable", "crm_origin_command_immutable"])(
  "missing trigger %s blocks",
  async name => {
    await lab.mutate(`DROP TRIGGER ${name}`);
    await blocked(`H01_TRIGGER_MISSING_OR_UNEXPECTED:${name}`);
  }
);
it.each([
  ["crm_origin_journal_immutable", "CrmOriginJournals", "stateVersion"],
  ["crm_origin_command_immutable", "CrmOriginCaptureCommands", "inputHash"]
] as const)("name-only no-op %s blocks", async (name, table, field) => {
  await lab.mutate(`DROP TRIGGER ${name}`);
  await lab.mutate(
    `CREATE TRIGGER ${name} BEFORE UPDATE ON ${table} FOR EACH ROW SET NEW.${field}=NEW.${field}`
  );
  await blocked(`H01_TRIGGER_DEFINITION_INVALID:${name}`);
});
it("mixed H01/R10 installation blocks despite both names", async () => {
  await lab.restore(false);
  const originals = await lab.database.query<{ statement: string }>(
    "SELECT ACTION_STATEMENT AS statement FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='crm_origin_command_immutable'",
    { type: QueryTypes.SELECT }
  );
  await lab.restore(true);
  await lab.mutate("DROP TRIGGER crm_origin_command_immutable");
  await lab.mutate(
    `CREATE TRIGGER crm_origin_command_immutable BEFORE UPDATE ON CrmOriginCaptureCommands FOR EACH ROW ${originals[0].statement}`
  );
  await blocked("H01_PARTIAL_INSTALLATION_REQUIRES_WRITER_FREEZE");
});
it("extra trigger blocks instead of assuming known names suffice", async () => {
  await lab.mutate(
    "CREATE TRIGGER r15_unexpected BEFORE INSERT ON CrmOriginJournals FOR EACH ROW SET NEW.stateVersion=NEW.stateVersion"
  );
  await blocked(
    "H01_TRIGGER_MISSING_OR_UNEXPECTED:crm_origin_journal_immutable"
  );
});
it("divergent trigger definition blocks", async () => {
  const current = await lab.database.query<{ statement: string }>(
    "SELECT ACTION_STATEMENT AS statement FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME='crm_origin_journal_immutable'",
    { type: QueryTypes.SELECT }
  );
  await lab.mutate("DROP TRIGGER crm_origin_journal_immutable");
  await lab.mutate(
    `CREATE TRIGGER crm_origin_journal_immutable BEFORE UPDATE ON CrmOriginJournals FOR EACH ROW ${current[0].statement.replace(
      "ORIGIN_JOURNAL_IMMUTABLE",
      "DIVERGENT_CONTRACT"
    )}`
  );
  await blocked("H01_TRIGGER_DEFINITION_INVALID:crm_origin_journal_immutable");
});
it("explicit database mismatch blocks before inspecting another schema", async () => {
  const result = await AssessCrmIntegrationReadiness({
    ...options(),
    targetDatabase: "different_synthetic_database"
  });
  expect(result.matrix.LOCAL_SCHEMA.codes).toEqual([
    "SCHEMA_DATABASE_MISMATCH"
  ]);
  expect(lab.statements.length).toBe(1);
});
it("disabled never reads SQL or transport even on a real lab connection", async () => {
  const result = await AssessCrmIntegrationReadiness({
    ...options(),
    enabled: false
  });
  expect(result.status).toBe("DISABLED");
  expect(lab.statements).toEqual([]);
});
