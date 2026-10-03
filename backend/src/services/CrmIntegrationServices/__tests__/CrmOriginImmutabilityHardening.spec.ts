import http from "http";
import https from "https";
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import {
  InitializeCrmImmutabilityLab,
  ImmutabilityLab,
  HardeningContact,
  HardeningInfo,
  hardeningIdentity
} from "./fixtures/CrmImmutabilityLab";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";
import {
  OriginJournalEntry,
  OriginJournalHash,
  VerifyOriginJournalEntry
} from "../CrmOriginJournalService";
import CreateContactService from "../../ContactServices/CreateContactService";
import UpdateContactService from "../../ContactServices/UpdateContactService";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";

let mockContact: typeof HardeningContact;
let mockInfo: typeof HardeningInfo;
jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  get default() {
    return mockContact;
  }
}));
jest.mock("../../../models/ContactCustomField", () => ({
  __esModule: true,
  get default() {
    return mockInfo;
  }
}));
jest.mock("../../WebhookServices/TriggerWebhooksService", () => ({
  __esModule: true,
  default: jest.fn(async () => undefined)
}));
const migration = require("../../../database/migrations/20261003125100-harden-crm-origin-immutability");
let lab: ImmutabilityLab;
const harden = async () => {
  await lab.guard();
  await migration.up(lab.database.getQueryInterface());
};
const hexText = (value: unknown) =>
  Buffer.from(String(value), "hex").toString("utf8");
beforeAll(async () => {
  lab = await InitializeCrmImmutabilityLab();
  mockContact = HardeningContact;
  mockInfo = HardeningInfo;
});
beforeEach(async () => {
  jest.spyOn(http, "request").mockImplementation(() => {
    throw new Error("H01_HTTP_FORBIDDEN");
  });
  jest.spyOn(https, "request").mockImplementation(() => {
    throw new Error("H01_HTTPS_FORBIDDEN");
  });
  await lab.restore();
  (TriggerWebhooksService as jest.Mock).mockClear();
});
afterEach(() => {
  expect(http.request).not.toHaveBeenCalled();
  expect(https.request).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});
afterAll(async () => {
  if (lab) await lab.close();
});
it("A reproduces original R10 corruption; this is not an R10 security PASS", async () => {
  const { eventId } = await lab.seed();
  const before = await lab.bytes("CrmOriginJournals", eventId);
  await lab.exec(
    "UPDATE CrmOriginJournals SET canonicalBody=CONCAT(canonicalBody,' ') WHERE eventId=:eventId",
    { eventId }
  );
  const after = await lab.bytes("CrmOriginJournals", eventId);
  expect(after.canonicalBody).toBe(`${before.canonicalBody}20`);
  expect(after.bodyHash).toBe(before.bodyHash);
  const rows = await lab.database.query<{ invalid: number }>(
    "SELECT COUNT(*) AS invalid FROM CrmOriginJournals WHERE SHA2(canonicalBody,256)<>bodyHash",
    { type: QueryTypes.SELECT }
  );
  expect(Number(rows[0].invalid)).toBe(1);
});
it("B rejects trailing canonicalBody bytes and preserves entire row", async () => {
  const { eventId } = await lab.seed();
  const before = await lab.bytes("CrmOriginJournals", eventId);
  await lab.guard();
  await require("../../../database/migrations/20261003125100-harden-crm-origin-immutability").up(
    lab.database.getQueryInterface()
  );
  await expect(
    lab.exec(
      "UPDATE CrmOriginJournals SET canonicalBody=CONCAT(canonicalBody,' ') WHERE eventId=:eventId",
      { eventId }
    )
  ).rejects.toMatchObject({ original: { sqlState: "45000" } });
  expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
});

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
const limits: Record<string, number> = {
  eventId: 36,
  correlationId: 36,
  organizationId: 36,
  bodyHash: 64,
  semanticHash: 64,
  occurredAt: 24,
  captureKey: 36,
  inputHash: 64
};
const trailingWithinCapacity = (field: string, original: string) =>
  original.length >= (limits[field] || Infinity)
    ? `${original.slice(0, -1)} `
    : `${original} `;
it.each(journalText)(
  "B immutable journal text %s rejects changed trailing bytes",
  async field => {
    const { eventId } = await lab.seed();
    await harden();
    const before = await lab.bytes("CrmOriginJournals", eventId);
    const value = trailingWithinCapacity(field, hexText(before[field]));
    await expect(
      lab.exec(
        `UPDATE CrmOriginJournals SET ${field}=:value WHERE eventId=:eventId`,
        { value, eventId }
      )
    ).rejects.toMatchObject({ original: { sqlState: "45000" } });
    expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
  }
);
it.each([
  ["leading", (value: string): string => ` ${value}`],
  ["multiple trailing", (value: string): string => `${value}   `],
  ["tab", (value: string): string => `${value}\t`],
  ["newline", (value: string): string => `${value}\n`],
  ["case", (value: string): string => value.toUpperCase()],
  [
    "UTF8 two-byte",
    (value: string): string =>
      `${value}${Buffer.from("c3a9", "hex").toString("utf8")}`
  ],
  [
    "UTF8 four-byte",
    (value: string): string =>
      `${value}${Buffer.from("f09f9880", "hex").toString("utf8")}`
  ]
] as const)(
  "B canonicalBody rejects %s byte mutation",
  async (_name, change) => {
    const { eventId } = await lab.seed();
    await harden();
    const before = await lab.bytes("CrmOriginJournals", eventId);
    await expect(
      lab.exec(
        "UPDATE CrmOriginJournals SET canonicalBody=:value WHERE eventId=:eventId",
        { value: change(hexText(before.canonicalBody)), eventId }
      )
    ).rejects.toMatchObject({ original: { sqlState: "45000" } });
    expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
  }
);
it.each([
  ["sourceRevision", 2],
  ["schemaVersion", 2],
  ["createdAt", "2000-01-01 00:00:00"]
] as const)(
  "B preserves immutable numeric/temporal %s",
  async (field, value) => {
    const { eventId } = await lab.seed();
    await harden();
    const before = await lab.bytes("CrmOriginJournals", eventId);
    await expect(
      lab.exec(
        `UPDATE CrmOriginJournals SET ${field}=:value WHERE eventId=:eventId`,
        { value, eventId }
      )
    ).rejects.toMatchObject({ original: { sqlState: "45000" } });
    expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
  }
);
it.each([
  "captureKey",
  "sourceInstanceId",
  "integrationId",
  "organizationId",
  "inputHash"
])("C command text %s rejects changed trailing bytes", async field => {
  const { captureKey } = await lab.seed();
  await harden();
  const before = await lab.bytes("CrmOriginCaptureCommands", captureKey);
  await expect(
    lab.exec(
      `UPDATE CrmOriginCaptureCommands SET ${field}=:value WHERE captureKey=:captureKey`,
      {
        value: trailingWithinCapacity(field, hexText(before[field])),
        captureKey
      }
    )
  ).rejects.toMatchObject({ original: { sqlState: "45000" } });
  expect(await lab.bytes("CrmOriginCaptureCommands", captureKey)).toEqual(
    before
  );
});
it("C command createdAt is immutable", async () => {
  const { captureKey } = await lab.seed();
  await harden();
  const before = await lab.bytes("CrmOriginCaptureCommands", captureKey);
  await expect(
    lab.exec(
      "UPDATE CrmOriginCaptureCommands SET createdAt='2000-01-01 00:00:00' WHERE captureKey=:captureKey",
      { captureKey }
    )
  ).rejects.toMatchObject({ original: { sqlState: "45000" } });
  expect(await lab.bytes("CrmOriginCaptureCommands", captureKey)).toEqual(
    before
  );
});
it.each([" ", "   ", "\t", "\n", "replacement", "null"])(
  "C outcome write-once protects %s",
  async kind => {
    const { captureKey } = await lab.seed();
    await harden();
    await lab.exec(
      "UPDATE CrmOriginCaptureCommands SET outcome=NULL WHERE captureKey=:captureKey",
      { captureKey }
    );
    const first = JSON.stringify({
      source: "committed",
      contactId: 1,
      intent: "persisted",
      eventId: null,
      reason: "synthetic"
    });
    await lab.exec(
      "UPDATE CrmOriginCaptureCommands SET outcome=:first WHERE captureKey=:captureKey",
      { first, captureKey }
    );
    const before = await lab.bytes("CrmOriginCaptureCommands", captureKey);
    expect(before.outcome).toBe(
      Buffer.from(first).toString("hex").toUpperCase()
    );
    const value =
      kind === "null"
        ? null
        : kind === "replacement"
        ? "{}"
        : `${first}${kind}`;
    await expect(
      lab.exec(
        "UPDATE CrmOriginCaptureCommands SET outcome=:value WHERE captureKey=:captureKey",
        { value, captureKey }
      )
    ).rejects.toMatchObject({ original: { sqlState: "45000" } });
    expect(await lab.bytes("CrmOriginCaptureCommands", captureKey)).toEqual(
      before
    );
  }
);
const receipt = (entry: OriginJournalEntry, accepted = false) => ({
  schema_version: 1,
  event_id: entry.eventId,
  organization_id: hardeningIdentity.organizationId,
  correlation_id: entry.correlationId,
  receipt_id: randomUUID(),
  processing_state: accepted ? "accepted" : "processed",
  contact_result: {
    status: accepted ? "not_persisted" : "created",
    crm_contact_id: accepted ? null : randomUUID(),
    persisted_at: accepted ? null : "2026-10-03T15:00:31.000Z"
  },
  commercial_result: {
    status: "not_requested",
    primary_deal_id: null,
    opportunity_id: null
  },
  error: null
});
it("D real repository preserves CAS, lease recovery, fencing, receipt and hash", async () => {
  const { eventId } = await lab.seed();
  await harden();
  const before = await lab.bytes("CrmOriginJournals", eventId);
  const repository = new SequelizeCrmOriginJournalRepository(
    lab.database,
    HardeningContact
  );
  const now = new Date("2026-10-03T15:00:00.000Z"),
    later = new Date(+now + 31000),
    attempt = randomUUID();
  const claimed = await repository.transition(
    hardeningIdentity,
    eventId,
    0,
    {
      kind: "begin_attempt",
      attemptId: attempt,
      leaseExpiresAt: new Date(+now + 30000).toISOString()
    },
    now
  );
  expect(claimed).toMatchObject({
    state: "attempt_started",
    stateVersion: 1,
    attemptCount: 1
  });
  await expect(
    repository.transition(
      hardeningIdentity,
      eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId: randomUUID(),
        leaseExpiresAt: new Date(+now + 30000).toISOString()
      },
      now
    )
  ).rejects.toThrow("ORIGIN_STATE_VERSION_CONFLICT");
  await repository.transition(
    hardeningIdentity,
    eventId,
    1,
    { kind: "transport_accepted", attemptId: attempt },
    now
  );
  expect(
    await repository.recoverExpired(hardeningIdentity, later, eventId)
  ).toBe(1);
  const recovered = (await repository.read(hardeningIdentity, eventId))!;
  expect(recovered).toMatchObject({
    state: "reconciliation_required",
    stateVersion: 3,
    leaseExpiresAt: null
  });
  const next = randomUUID();
  const second = await repository.transition(
    hardeningIdentity,
    eventId,
    3,
    {
      kind: "begin_attempt",
      attemptId: next,
      leaseExpiresAt: new Date(+later + 30000).toISOString()
    },
    later
  );
  expect(second.attemptCount).toBe(2);
  await expect(
    repository.transition(
      hardeningIdentity,
      eventId,
      4,
      { kind: "receipt", attemptId: attempt, value: receipt(second) },
      later
    )
  ).rejects.toThrow("ORIGIN_ATTEMPT_ID_CONFLICT");
  const value = receipt(second);
  const final = await repository.transition(
    hardeningIdentity,
    eventId,
    4,
    { kind: "receipt", attemptId: next, value },
    later
  );
  expect(final).toMatchObject({
    state: "contact_confirmed",
    stateVersion: 5,
    receipt: value,
    leaseExpiresAt: null
  });
  const durable = (await repository.read(hardeningIdentity, eventId))!;
  const beforeReplay = await lab.bytes("CrmOriginJournals", eventId);
  expect(
    await repository.transition(
      hardeningIdentity,
      eventId,
      0,
      { kind: "receipt", value },
      later
    )
  ).toEqual(durable);
  expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(beforeReplay);
  VerifyOriginJournalEntry(final);
  const after = await lab.bytes("CrmOriginJournals", eventId);
  for (const field of [
    ...journalText,
    "sourceRevision",
    "schemaVersion",
    "createdAt"
  ])
    expect(after[field]).toBe(before[field]);
});
it("D receipt_validated and terminal_failure remain legitimate states", async () => {
  const { eventId } = await lab.seed();
  await harden();
  const repository = new SequelizeCrmOriginJournalRepository(
      lab.database,
      HardeningContact
    ),
    now = new Date("2026-10-03T15:00:00.000Z");
  const entry = (await repository.read(hardeningIdentity, eventId))!;
  expect(
    (
      await repository.transition(
        hardeningIdentity,
        eventId,
        0,
        { kind: "receipt", value: receipt(entry, true) },
        now
      )
    ).state
  ).toBe("receipt_validated");
  const attemptId = randomUUID();
  await repository.transition(
    hardeningIdentity,
    eventId,
    1,
    {
      kind: "begin_attempt",
      attemptId,
      leaseExpiresAt: new Date(+now + 30000).toISOString()
    },
    now
  );
  expect(
    (
      await repository.transition(
        hardeningIdentity,
        eventId,
        2,
        { kind: "terminal_failure", attemptId, code: "synthetic_failure" },
        now
      )
    ).state
  ).toBe("terminal_failure");
});
it("D real R11/R12 producers commit, replay and preserve source hashes under H01", async () => {
  await harden();
  await lab.guard();
  const context = {
    enabled: true,
    identity: hardeningIdentity,
    captureKey: randomUUID(),
    correlationId: randomUUID(),
    phoneE164: "+12025550101",
    bindingStatus: "not_linked" as const,
    context: {
      channel: "manual" as const,
      provenance: "manual" as const,
      authorized: true,
      fromMe: false as const,
      isGroup: false as const
    }
  };
  const input = {
    name: "Synthetic Contact",
    number: "12025550101",
    email: "synthetic@example.invalid",
    extraInfo: [{ name: "Synthetic Field", value: "Synthetic Value" }],
    tagIds: [1],
    captureChannel: "Synthetic Manual"
  };
  const created = await CreateContactService(input, context);
  expect((await CreateContactService(input, context)).id).toBe(created.id);
  expect(await CrmOriginJournal.count()).toBe(1);
  expect(await HardeningContact.count()).toBe(1);
  const updateContext = {
    ...context,
    captureKey: randomUUID(),
    correlationId: randomUUID(),
    bindingStatus: "linked" as const
  };
  const update = {
    contactId: String(created.id),
    contactData: {
      name: "Synthetic Enriched",
      captureChannel: "Synthetic Updated"
    }
  };
  expect((await UpdateContactService(update, updateContext)).name).toBe(
    "Synthetic Enriched"
  );
  expect((await UpdateContactService(update, updateContext)).name).toBe(
    "Synthetic Enriched"
  );
  const rows = await CrmOriginJournal.findAll({
    order: [["sourceRevision", "ASC"]]
  });
  expect(rows.map(row => Number(row.sourceRevision))).toEqual([1, 2]);
  expect(await CrmOriginCaptureCommand.count()).toBe(2);
  for (const row of rows)
    expect(row.bodyHash).toBe(OriginJournalHash(row.canonicalBody));
  expect(TriggerWebhooksService).toHaveBeenCalledTimes(2);
  await lab.guard();
  await migration.verify(lab.database.getQueryInterface());
});
it("E preexisting historical corruption blocks migration before DDL", async () => {
  const { eventId } = await lab.seed();
  await lab.exec(
    "UPDATE CrmOriginJournals SET canonicalBody=CONCAT(canonicalBody,' ') WHERE eventId=:eventId",
    { eventId }
  );
  const spy = jest.spyOn(lab.database, "query");
  await expect(harden()).rejects.toThrow(
    "H01_PREEXISTING_CORRUPTION_REQUIRES_RECONCILIATION"
  );
  expect(
    spy.mock.calls.some(args => /^(DROP|CREATE) TRIGGER/.test(String(args[0])))
  ).toBe(false);
});
it.each([
  [
    "missing table",
    "DROP TABLE CrmOriginCaptureCommands",
    "H01_SCHEMA_TABLE_INVALID"
  ],
  [
    "MyISAM",
    "ALTER TABLE CrmOriginCaptureCommands ENGINE=MyISAM",
    "H01_SCHEMA_TABLE_INVALID"
  ],
  [
    "missing column",
    "ALTER TABLE CrmOriginJournals DROP COLUMN lastErrorCode",
    "H01_SCHEMA_COLUMNS_INVALID"
  ],
  [
    "incompatible column",
    "ALTER TABLE CrmOriginJournals MODIFY attemptCount BIGINT NOT NULL",
    "H01_SCHEMA_COLUMN_INVALID"
  ],
  [
    "missing unique index",
    "ALTER TABLE CrmOriginJournals DROP INDEX crm_origin_identity_revision_unique",
    "H01_SCHEMA_INDEX_INVALID"
  ],
  [
    "missing trigger",
    "DROP TRIGGER crm_origin_command_immutable",
    "H01_TRIGGER_MISSING_OR_UNEXPECTED"
  ]
] as const)("E refuses %s before repair DDL", async (_name, sql, code) => {
  await lab.exec(sql);
  const spy = jest.spyOn(lab.database, "query");
  await expect(harden()).rejects.toThrow(code);
  expect(
    spy.mock.calls.some(args => /^(DROP|CREATE) TRIGGER/.test(String(args[0])))
  ).toBe(false);
});
it("E post inspection refuses name-only ineffective replacement", async () => {
  await harden();
  await lab.exec("DROP TRIGGER crm_origin_journal_immutable");
  await lab.exec(
    "CREATE TRIGGER crm_origin_journal_immutable BEFORE UPDATE ON CrmOriginJournals FOR EACH ROW SET NEW.stateVersion=NEW.stateVersion"
  );
  await expect(
    migration.verify(lab.database.getQueryInterface())
  ).rejects.toThrow("H01_TRIGGER_DEFINITION_INVALID");
});
it("E post inspection refuses absent hardened trigger", async () => {
  await harden();
  await lab.exec("DROP TRIGGER crm_origin_command_immutable");
  await expect(
    migration.verify(lab.database.getQueryInterface())
  ).rejects.toThrow("H01_TRIGGER_MISSING_OR_UNEXPECTED");
});
it("E interrupted DDL fails explicitly and cannot silently retry partial install", async () => {
  const original = lab.database.query.bind(lab.database);
  const spy = jest
    .spyOn(lab.database, "query")
    .mockImplementation((sql, options) => {
      if (
        typeof sql === "string" &&
        sql.startsWith("CREATE TRIGGER crm_origin_command_immutable")
      )
        throw new Error("SYNTHETIC_DDL_INTERRUPTION");
      return original(sql, options);
    });
  await expect(harden()).rejects.toThrow(
    "H01_DDL_OR_POSTCHECK_FAILED_REQUIRES_WRITER_FREEZE"
  );
  spy.mockRestore();
  await expect(
    migration.verify(lab.database.getQueryInterface())
  ).rejects.toThrow("H01_TRIGGER_MISSING_OR_UNEXPECTED");
  await expect(harden()).rejects.toThrow("H01_TRIGGER_MISSING_OR_UNEXPECTED");
});
it("E successful reinspection/rerun is idempotent and down is always blocked", async () => {
  const { eventId, captureKey } = await lab.seed();
  await harden();
  const before = await lab.bytes("CrmOriginJournals", eventId),
    command = await lab.bytes("CrmOriginCaptureCommands", captureKey);
  await harden();
  await migration.verify(lab.database.getQueryInterface());
  await expect(
    migration.down(lab.database.getQueryInterface())
  ).rejects.toThrow("H01_AUTOMATIC_ROLLBACK_FORBIDDEN");
  expect(await lab.bytes("CrmOriginJournals", eventId)).toEqual(before);
  expect(await lab.bytes("CrmOriginCaptureCommands", captureKey)).toEqual(
    command
  );
});
