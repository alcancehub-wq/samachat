import "reflect-metadata";
import { randomUUID } from "crypto";
import {
  DataTypes,
  Model,
  ModelAttributes,
  ModelCtor,
  QueryTypes
} from "sequelize";
import { Sequelize } from "sequelize-typescript";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import CrmOriginJournalService, {
  OriginCaptureRequest,
  OriginCaptureOutcome,
  OriginJournalHash
} from "../CrmOriginJournalService";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";

const laboratory =
  process.env.CRM_ORIGIN_LAB_ENABLED === "1" ? describe : describe.skip;
const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const request = (): OriginCaptureRequest => ({
  captureKey: randomUUID(),
  correlationId: randomUUID(),
  mutation: {
    kind: "create",
    data: { name: "Synthetic Contact", number: "12025550101", isGroup: false }
  },
  phoneE164: "+12025550101",
  bindingStatus: "not_linked",
  context: {
    channel: "whatsapp_inbound",
    provenance: "realtime",
    authorized: true,
    fromMe: false,
    isGroup: false
  },
  metadata: { messageProvenance: { kind: "realtime", provider: "wwebjs" } }
});
laboratory("R10 isolated MySQL/InnoDB transaction", () => {
  let database: Sequelize;
  let contacts: ModelCtor<Model>;
  let repository: SequelizeCrmOriginJournalRepository;
  let service: CrmOriginJournalService;
  let httpsRequest: jest.SpyInstance;
  let httpRequest: jest.SpyInstance;
  const migration = require("../../../database/migrations/20261002173000-create-crm-origin-journal");
  beforeAll(async () => {
    httpsRequest = jest
      .spyOn(require("https"), "request")
      .mockImplementation(() => {
        throw new Error("NO_EXTERNAL_HTTP_AUTHORIZED");
      });
    httpRequest = jest
      .spyOn(require("http"), "request")
      .mockImplementation(() => {
        throw new Error("NO_EXTERNAL_HTTP_AUTHORIZED");
      });
    const mysql = require("mysql2/promise");
    const admin = await mysql.createConnection({
      host: "127.0.0.1",
      port: 55441,
      user: "root",
      password: ""
    });
    try {
      const [rows] = await admin.query(
        "SELECT @@datadir AS directory,VERSION() AS version"
      );
      if (
        !String(rows[0].directory)
          .replace(/\\/g, "/")
          .includes(
            "samachat-crm-p02-r10-origin-journal-20261002/backend/node_modules/.cache/r10-origin-lab/data/"
          ) ||
        !String(rows[0].version).startsWith("10.11.10-MariaDB")
      )
        throw new Error("REFUSING_NON_LAB_DATABASE");
      await admin.query("DROP DATABASE IF EXISTS r10_origin_lab");
      await admin.query(
        "CREATE DATABASE r10_origin_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
      );
    } finally {
      await admin.end();
    }
    database = new Sequelize({
      database: "r10_origin_lab",
      username: "root",
      password: "",
      host: "127.0.0.1",
      port: 55441,
      dialect: "mysql",
      dialectModule: require("mysql2"),
      logging: false,
      models: [CrmOriginJournal, CrmOriginCaptureCommand],
      pool: { min: 0, max: 5 },
      define: { charset: "utf8mb4", collate: "utf8mb4_bin" }
    });
    const attributes: ModelAttributes = {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING },
      number: { type: DataTypes.STRING, unique: true },
      lid: { type: DataTypes.STRING, unique: true },
      isGroup: { type: DataTypes.BOOLEAN, defaultValue: false },
      email: { type: DataTypes.STRING, defaultValue: "" },
      profilePicUrl: { type: DataTypes.STRING },
      city: { type: DataTypes.STRING },
      state: { type: DataTypes.STRING },
      captureChannel: { type: DataTypes.STRING },
      wasReferred: { type: DataTypes.BOOLEAN },
      referralType: { type: DataTypes.STRING },
      referralContactId: { type: DataTypes.INTEGER },
      referralContactName: { type: DataTypes.STRING },
      referralUserId: { type: DataTypes.INTEGER },
      referralPartnerName: { type: DataTypes.STRING },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    };
    await database
      .getQueryInterface()
      .createTable("Contacts", attributes, { engine: "InnoDB" });
    class OriginLabContact extends Model {}
    OriginLabContact.init(attributes, {
      sequelize: database,
      modelName: "OriginLabContact",
      tableName: "Contacts",
      timestamps: true
    });
    contacts = OriginLabContact;
    await database.query(
      "CREATE TABLE Tickets(id INT PRIMARY KEY,status VARCHAR(30),unreadMessages INT,userId INT,queueId INT,whatsappId INT) ENGINE=InnoDB"
    );
    await database.query("INSERT INTO Tickets VALUES(1,'open',3,10,20,30)");
    await migration.up(database.getQueryInterface());
    repository = new SequelizeCrmOriginJournalRepository(database, contacts);
    service = new CrmOriginJournalService(repository, {
      enabled: true,
      identity
    });
  }, 30000);
  beforeEach(async () => {
    await database.query("DELETE FROM CrmOriginJournals");
    await database.query("DELETE FROM CrmOriginCaptureCommands");
    await database.query("DELETE FROM Contacts");
  });
  afterEach(() => {
    expect(httpsRequest).not.toHaveBeenCalled();
    expect(httpRequest).not.toHaveBeenCalled();
  });
  afterAll(async () => {
    httpsRequest?.mockRestore();
    httpRequest?.mockRestore();
    if (database) await database.close();
  });
  const capture = async (value = request()): Promise<OriginCaptureOutcome> =>
    (await service.capture(value)) as OriginCaptureOutcome;
  const update = (
    contactId: number,
    data: { name?: string; email?: string; profilePicUrl?: string }
  ): OriginCaptureRequest => ({
    ...request(),
    mutation: { kind: "update", contactId, data }
  });
  const count = async (
    table: "Contacts" | "CrmOriginJournals" | "CrmOriginCaptureCommands"
  ) =>
    Number(
      (
        (
          await database.query(`SELECT COUNT(*) AS total FROM ${table}`, {
            type: QueryTypes.SELECT
          })
        )[0] as { total: unknown }
      ).total
    );

  it("migration creates InnoDB tables and initial contact/body in one commit", async () => {
    const result = await capture();
    const entry = await repository.read(identity, result.eventId!);
    expect(entry).toMatchObject({
      sourceContactId: String(result.contactId),
      sourceRevision: 1,
      state: "intent_persisted",
      commercialOperation: "not_requested"
    });
    expect(entry!.bodyHash).toBe(OriginJournalHash(entry!.canonicalBody));
    const engines = await database.query(
      "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='r10_origin_lab'",
      { type: QueryTypes.SELECT }
    );
    expect(engines.every((row: any) => row.ENGINE === "InnoDB")).toBe(true);
  });
  it("semantic update increments revision; technical/photo change does not", async () => {
    const first = await capture();
    const second = await capture(
      update(first.contactId, { name: "Synthetic Enriched" })
    );
    expect(
      (await repository.read(identity, second.eventId!))!.sourceRevision
    ).toBe(2);
    const technical = await capture(
      update(first.contactId, {
        email: "synthetic@example.invalid",
        profilePicUrl: "synthetic-image"
      })
    );
    expect(technical.intent).toBe("existing");
    expect(technical.eventId).toBe(second.eventId);
    expect(await count("CrmOriginJournals")).toBe(2);
  });
  it("same capture key replays original result without another contact/event", async () => {
    const value = request();
    const first = await capture(value);
    expect(await capture(value)).toEqual(first);
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
  });
  it("capture key divergence conflicts before source change", async () => {
    const value = request();
    await capture(value);
    await expect(
      capture({ ...value, phoneE164: "+12025550102" })
    ).rejects.toThrow("ORIGIN_CAPTURE_KEY_CONFLICT");
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
  });
  it("completed command hash and result cannot be overwritten by raw SQL", async () => {
    const value = request();
    const first = await capture(value);
    for (const [column, replacement] of [
      ["inputHash", "0".repeat(64)],
      ["outcome", "{}"]
    ]) {
      await expect(
        database.query(
          `UPDATE CrmOriginCaptureCommands SET ${column}=:replacement WHERE captureKey=:captureKey`,
          { replacements: { replacement, captureKey: value.captureKey } }
        )
      ).rejects.toThrow("ORIGIN_COMMAND_IMMUTABLE");
    }
    expect(await capture(value)).toEqual(first);
  });
  it("two concurrent executions of one command resolve the same event", async () => {
    const value = request();
    const results = await Promise.all([capture(value), capture(value)]);
    expect(results[0]).toEqual(results[1]);
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
  });
  it("concurrent semantic changes serialize revisions without collision", async () => {
    const first = await capture();
    const changes = await Promise.all([
      capture(update(first.contactId, { name: "Synthetic A" })),
      capture(update(first.contactId, { name: "Synthetic B" }))
    ]);
    const revisions = await Promise.all(
      changes.map(
        async change =>
          (await repository.read(identity, change.eventId!))!.sourceRevision
      )
    );
    expect(revisions.sort()).toEqual([2, 3]);
    expect(await count("CrmOriginJournals")).toBe(3);
  });
  it("raw SQL cannot mutate event ID, revision, body or integrity hash", async () => {
    const result = await capture();
    const before = await repository.read(identity, result.eventId!);
    for (const [column, value] of [
      ["eventId", randomUUID()],
      ["sourceRevision", 99],
      ["canonicalBody", "{}"],
      ["bodyHash", "0".repeat(64)]
    ] as const) {
      await expect(
        database.query(
          `UPDATE CrmOriginJournals SET ${column}=:value WHERE eventId=:eventId`,
          { replacements: { value, eventId: result.eventId } }
        )
      ).rejects.toThrow("ORIGIN_JOURNAL_IMMUTABLE");
    }
    expect(await repository.read(identity, result.eventId!)).toEqual(before);
  });
  it("journal insert failure rolls back source and command", async () => {
    await database.query(
      "CREATE TRIGGER r10_fault BEFORE INSERT ON CrmOriginJournals FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_journal_failure'"
    );
    try {
      await expect(capture()).rejects.toThrow("synthetic_journal_failure");
    } finally {
      await database.query("DROP TRIGGER r10_fault");
    }
    expect(await count("Contacts")).toBe(0);
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
  });
  it("source insert failure cannot leave a journal or command", async () => {
    await database.query(
      "CREATE TRIGGER r10_fault BEFORE INSERT ON Contacts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_source_failure'"
    );
    try {
      await expect(capture()).rejects.toThrow("synthetic_source_failure");
    } finally {
      await database.query("DROP TRIGGER r10_fault");
    }
    expect(await count("Contacts")).toBe(0);
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
  });
  it("journal failure during update preserves original contact and prior immutable event", async () => {
    const first = await capture();
    const original = await repository.read(identity, first.eventId!);
    await database.query(
      "CREATE TRIGGER r10_fault BEFORE INSERT ON CrmOriginJournals FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_update_failure'"
    );
    try {
      await expect(
        capture(update(first.contactId, { name: "Must Roll Back" }))
      ).rejects.toThrow("synthetic_update_failure");
    } finally {
      await database.query("DROP TRIGGER r10_fault");
    }
    expect((await contacts.findByPk(first.contactId))!.get("name")).toBe(
      "Synthetic Contact"
    );
    expect(await repository.read(identity, first.eventId!)).toEqual(original);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(await count("CrmOriginCaptureCommands")).toBe(1);
  });
  it("failure after journal write but before commit rolls back both", async () => {
    const faulty = {
      transaction: <Result>(work: any): Promise<Result> =>
        repository.transaction(async unit =>
          work({
            ...unit,
            completeCommand: async () => {
              throw new Error("synthetic_precommit_failure");
            }
          })
        )
    };
    const failure = new CrmOriginJournalService(faulty, {
      enabled: true,
      identity
    });
    await expect(failure.capture(request())).rejects.toThrow(
      "synthetic_precommit_failure"
    );
    expect(await count("Contacts")).toBe(0);
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("closed default does not persist a source mutation", async () => {
    const disabled = new CrmOriginJournalService(repository, {
      enabled: false,
      identity
    });
    expect((await disabled.capture(request())).intent).toBe("disabled");
    expect(await count("Contacts")).toBe(0);
  });
  it("LID-only remains pending identity without inventing telephone/event", async () => {
    const value = request();
    const result = await capture({
      ...value,
      phoneE164: null,
      mutation: {
        kind: "create",
        data: {
          name: "Synthetic LID",
          number: null,
          lid: "synthetic@lid",
          isGroup: false
        }
      }
    });
    expect(result.intent).toBe("pending_identity");
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("LID enrichment captures revision one for the same local identity", async () => {
    const initial = await capture({
      ...request(),
      phoneE164: null,
      mutation: {
        kind: "create",
        data: {
          name: "Synthetic LID",
          number: null,
          lid: "synthetic@lid",
          isGroup: false
        }
      }
    });
    const enriched = await capture({
      ...request(),
      mutation: {
        kind: "update",
        contactId: initial.contactId,
        data: { number: "12025550101" }
      }
    });
    expect(enriched.contactId).toBe(initial.contactId);
    expect(enriched.intent).toBe("persisted");
    expect(
      (await repository.read(identity, enriched.eventId!))!.sourceRevision
    ).toBe(1);
    expect(await count("Contacts")).toBe(1);
  });
  it("unknown local contact cannot leave a command or an event", async () => {
    await expect(
      capture(update(999999, { name: "Synthetic Missing" }))
    ).rejects.toThrow("ORIGIN_CONTACT_NOT_FOUND");
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("group/outbound/unauthorized do not create intents", async () => {
    for (const context of [
      { isGroup: true },
      { fromMe: true },
      { authorized: false }
    ]) {
      const value = request();
      await capture({
        ...value,
        context: { ...value.context, ...context },
        mutation: {
          kind: "update",
          contactId: (
            await contacts.create({
              name: "Synthetic",
              number: randomUUID(),
              isGroup: false
            })
          ).get("id") as number,
          data: {}
        }
      });
    }
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("manual capture requires authorization and preserves R09 envelope", async () => {
    const value = request();
    const result = await capture({
      ...value,
      metadata: null,
      context: { ...value.context, channel: "manual", provenance: "manual" }
    });
    const envelope = JSON.parse(
      (await repository.read(identity, result.eventId!))!.canonicalBody
    );
    expect(envelope.context).toEqual({
      channel: "manual",
      provenance: "manual",
      from_me: false,
      is_group: false
    });
  });
  it("target identity cannot silently change for the same local contact", async () => {
    const first = await capture();
    const other = new CrmOriginJournalService(repository, {
      enabled: true,
      identity: { ...identity, integrationId: "other-integration" }
    });
    await expect(
      other.capture(update(first.contactId, { name: "Rejected Change" }))
    ).rejects.toThrow("ORIGIN_TARGET_IDENTITY_CONFLICT");
    expect((await contacts.findByPk(first.contactId))!.get("name")).toBe(
      "Synthetic Contact"
    );
  });
  it("local scope read cannot leak another org receipt or pending entry", async () => {
    const first = await capture();
    const other = { ...identity, organizationId: randomUUID() };
    expect(await repository.read(other, first.eventId!)).toBeNull();
    expect(await repository.pending(other)).toEqual([]);
  });
  it("CAS allows one lease owner; expired lease recovers same body/event", async () => {
    const first = await capture();
    const original = await repository.read(identity, first.eventId!);
    const now = new Date();
    const attemptId = randomUUID();
    const claim = {
      kind: "begin_attempt" as const,
      attemptId,
      leaseExpiresAt: new Date(+now + 1000).toISOString()
    };
    await repository.transition(identity, first.eventId!, 0, claim, now);
    await expect(
      repository.transition(identity, first.eventId!, 0, claim, now)
    ).rejects.toThrow("ORIGIN_STATE_VERSION_CONFLICT");
    expect(
      await repository.recoverExpired(identity, new Date(+now + 2000))
    ).toBe(1);
    const restored = (await repository.pending(identity))[0];
    expect(restored.state).toBe("reconciliation_required");
    expect(restored.canonicalBody).toBe(original!.canonicalBody);
    expect(restored.eventId).toBe(first.eventId);
    expect(restored.attemptCount).toBe(1);
  });
  it("transport acceptance and timeout never confirm a CRM contact", async () => {
    const first = await capture();
    const now = new Date();
    const attemptId = randomUUID();
    await repository.transition(
      identity,
      first.eventId!,
      0,
      {
        kind: "begin_attempt",
        attemptId,
        leaseExpiresAt: new Date(+now + 1000).toISOString()
      },
      now
    );
    const accepted = await repository.transition(
      identity,
      first.eventId!,
      1,
      { kind: "transport_accepted", attemptId },
      now
    );
    expect(accepted.contactConfirmedAt).toBeNull();
    expect(accepted.receipt).toBeNull();
    const uncertain = await repository.transition(
      identity,
      first.eventId!,
      2,
      { kind: "uncertain", attemptId, code: "transport_timeout" },
      now
    );
    expect(uncertain.state).toBe("reconciliation_required");
    expect(uncertain.transportAcceptedAt).not.toBeNull();
  });
  it("remote receipt requires R09 identity/UUID/time and keeps contact/commercial independent", async () => {
    const first = await capture();
    const entry = (await repository.read(identity, first.eventId!))!;
    const now = new Date();
    const receipt = {
      schema_version: 1,
      event_id: entry.eventId,
      correlation_id: entry.correlationId,
      organization_id: identity.organizationId,
      receipt_id: randomUUID(),
      processing_state: "processed",
      contact_result: {
        status: "created",
        crm_contact_id: randomUUID(),
        persisted_at: now.toISOString()
      },
      commercial_result: {
        status: "not_requested",
        primary_deal_id: null,
        opportunity_id: null
      },
      error: null
    };
    await expect(
      repository.transition(
        identity,
        entry.eventId,
        0,
        {
          kind: "receipt",
          value: { ...receipt, organization_id: randomUUID() }
        },
        now
      )
    ).rejects.toThrow("ORIGIN_RECEIPT_INVALID");
    const confirmed = await repository.transition(
      identity,
      entry.eventId,
      0,
      { kind: "receipt", value: receipt },
      now
    );
    expect(confirmed.state).toBe("contact_confirmed");
    expect(confirmed.contactConfirmedAt).not.toBeNull();
    expect(confirmed.commercialOperation).toBe("not_requested");
    await expect(
      repository.transition(
        identity,
        entry.eventId,
        1,
        { kind: "terminal_failure", code: "late_timeout" },
        now
      )
    ).rejects.toThrow("ORIGIN_STATE_TERMINAL");
  });
  it("terminal failure does not regenerate event or delete source", async () => {
    const first = await capture();
    const failure = await repository.transition(
      identity,
      first.eventId!,
      0,
      { kind: "terminal_failure", code: "contract_rejected" },
      new Date()
    );
    expect(failure.eventId).toBe(first.eventId);
    expect(failure.state).toBe("terminal_failure");
    expect(await count("Contacts")).toBe(1);
  });
  it("accepted receipt remains recoverable for readback without confirming contact", async () => {
    const first = await capture();
    const original = (await repository.read(identity, first.eventId!))!;
    const value = {
      schema_version: 1,
      event_id: original.eventId,
      correlation_id: original.correlationId,
      organization_id: original.organizationId,
      receipt_id: randomUUID(),
      processing_state: "accepted",
      contact_result: {
        status: "not_persisted",
        crm_contact_id: null,
        persisted_at: null
      },
      commercial_result: {
        status: "not_requested",
        primary_deal_id: null,
        opportunity_id: null
      },
      error: null
    };
    await repository.transition(
      identity,
      original.eventId,
      0,
      { kind: "receipt", value },
      new Date()
    );
    const pending = (await repository.pending(identity))[0];
    expect(pending.state).toBe("receipt_validated");
    expect(pending.contactConfirmedAt).toBeNull();
    expect(pending.canonicalBody).toBe(original.canonicalBody);
    expect(pending.eventId).toBe(original.eventId);
  });
  it("new repository/connection reads persisted event after origin process restart", async () => {
    const first = await capture();
    const stored = (await repository.read(identity, first.eventId!))!;
    const reader = new Sequelize("r10_origin_lab", "root", "", {
      host: "127.0.0.1",
      port: 55441,
      dialect: "mysql",
      dialectModule: require("mysql2"),
      logging: false
    });
    try {
      const rows = await reader.query(
        "SELECT eventId,canonicalBody,bodyHash FROM CrmOriginJournals WHERE eventId=:eventId",
        { replacements: { eventId: first.eventId }, type: QueryTypes.SELECT }
      );
      expect(rows[0]).toEqual({
        eventId: stored.eventId,
        canonicalBody: stored.canonicalBody,
        bodyHash: stored.bodyHash
      });
    } finally {
      await reader.close();
    }
  });
  it("does not alter ticket status/owner/queue/connection/unread count or send externally", async () => {
    const before = await database.query("SELECT * FROM Tickets", {
      type: QueryTypes.SELECT
    });
    await capture();
    expect(
      await database.query("SELECT * FROM Tickets", { type: QueryTypes.SELECT })
    ).toEqual(before);
  });
  it("schema rollback refuses to discard a persisted command/event", async () => {
    await capture();
    await expect(migration.down(database.getQueryInterface())).rejects.toThrow(
      "ORIGIN_ROLLBACK_REQUIRES_DATA_PRESERVATION"
    );
    expect(await count("CrmOriginJournals")).toBe(1);
  });
});
