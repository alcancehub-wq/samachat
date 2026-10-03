import "reflect-metadata";
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import {
  AutoIncrement,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Sequelize,
  Table
} from "sequelize-typescript";
import CreateContactService from "../../ContactServices/CreateContactService";
import UpdateContactService from "../../ContactServices/UpdateContactService";
import { CreateContactSourceContext } from "../CaptureCreateContactSourceBridge";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginJournalService from "../CrmOriginJournalService";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";

let mockContact: typeof ContactFixture;
let mockExtraInfo: typeof InfoFixture;
jest.mock("../../../models/Contact", () => ({
  __esModule: true,
  get default() {
    return mockContact;
  }
}));
jest.mock("../../../models/ContactCustomField", () => ({
  __esModule: true,
  get default() {
    return mockExtraInfo;
  }
}));
jest.mock("../../WebhookServices/TriggerWebhooksService", () => ({
  __esModule: true,
  default: jest.fn(async () => undefined)
}));

@Table({ tableName: "Contacts" })
class ContactFixture extends Model<ContactFixture> {
  @PrimaryKey @AutoIncrement @Column id!: number;
  @Column name!: string;
  @Column({ unique: true, type: DataType.STRING }) number!: string | null;
  @Column({ unique: true, type: DataType.STRING }) lid!: string | null;
  @Column({ defaultValue: false }) isGroup!: boolean;
  @Column({ defaultValue: false }) allowMultipleConversations!: boolean;
  @Column email!: string;
  @Column profilePicUrl!: string;
  @Column city!: string;
  @Column state!: string;
  @Column captureChannel!: string;
  @Column wasReferred!: boolean;
  @Column referralType!: string;
  @Column referralContactId!: number;
  @Column referralContactName!: string;
  @Column referralUserId!: number;
  @Column referralPartnerName!: string;
  @Column referralNote!: string;
  @HasMany(() => InfoFixture) extraInfo!: InfoFixture[];
  @BelongsToMany(() => TagFixture, () => ContactTagFixture) tags!: TagFixture[];
}
@Table({ tableName: "ContactCustomFields" })
class InfoFixture extends Model<InfoFixture> {
  @PrimaryKey @AutoIncrement @Column id!: number;
  @Column name!: string;
  @Column value!: string;
  @ForeignKey(() => ContactFixture) @Column contactId!: number;
}
@Table({ tableName: "Tags" })
class TagFixture extends Model<TagFixture> {
  @PrimaryKey @Column id!: number;
  @Column name!: string;
}
@Table({ tableName: "ContactTags", timestamps: false })
class ContactTagFixture extends Model<ContactTagFixture> {
  @ForeignKey(() => ContactFixture) @Column contactId!: number;
  @ForeignKey(() => TagFixture) @Column tagId!: number;
}

const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const input = () => ({
  name: "Synthetic Contact",
  number: "12025550101",
  email: "synthetic@example.invalid",
  extraInfo: [{ name: "Synthetic Field", value: "Synthetic Value" }],
  tagIds: [1],
  captureChannel: "Synthetic Manual"
});
const context = (): CreateContactSourceContext => ({
  enabled: true,
  identity,
  captureKey: randomUUID(),
  correlationId: randomUUID(),
  phoneE164: "+12025550101",
  bindingStatus: "not_linked",
  context: {
    channel: "manual",
    provenance: "manual",
    authorized: true,
    fromMe: false,
    isGroup: false
  }
});
const laboratory =
  process.env.CRM_SOURCE_BRIDGE_LAB_ENABLED === "1" ? describe : describe.skip;
laboratory("R11 real CreateContactService with R10 transaction", () => {
  let database: Sequelize;
  let httpsRequest: jest.SpyInstance;
  let httpRequest: jest.SpyInstance;
  const migration = require("../../../database/migrations/20261002173000-create-crm-origin-journal");
  beforeAll(async () => {
    httpsRequest = jest
      .spyOn(require("https"), "request")
      .mockImplementation(() => {
        throw new Error("EXTERNAL_HTTP_FORBIDDEN");
      });
    httpRequest = jest
      .spyOn(require("http"), "request")
      .mockImplementation(() => {
        throw new Error("EXTERNAL_HTTP_FORBIDDEN");
      });
    const mysql = require("mysql2/promise");
    const admin = await mysql.createConnection({
      host: "127.0.0.1",
      port: 55442,
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
            "samachat-crm-p02-r11-source-bridge-20261003/backend/node_modules/.cache/r11-source-lab/data/"
          ) ||
        !String(rows[0].version).startsWith("10.11.10-MariaDB")
      )
        throw new Error("REFUSING_NON_R11_LAB_DATABASE");
      await admin.query("DROP DATABASE IF EXISTS r11_source_lab");
      await admin.query(
        "CREATE DATABASE r11_source_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
      );
    } finally {
      await admin.end();
    }
    database = new Sequelize({
      database: "r11_source_lab",
      username: "root",
      password: "",
      host: "127.0.0.1",
      port: 55442,
      dialect: "mysql",
      dialectModule: require("mysql2"),
      logging: false,
      models: [
        ContactFixture,
        InfoFixture,
        TagFixture,
        ContactTagFixture,
        CrmOriginJournal,
        CrmOriginCaptureCommand
      ]
    });
    mockContact = ContactFixture;
    mockExtraInfo = InfoFixture;
    for (const model of [
      ContactFixture,
      InfoFixture,
      TagFixture,
      ContactTagFixture
    ])
      await model.sync();
    await TagFixture.create({ id: 1, name: "Synthetic Tag" });
    await database.query(
      "CREATE TABLE Tickets(id INT PRIMARY KEY,status VARCHAR(30),userId INT,queueId INT,whatsappId INT,unreadMessages INT) ENGINE=InnoDB"
    );
    await database.query("INSERT INTO Tickets VALUES(1,'open',10,20,30,3)");
    await migration.up(database.getQueryInterface());
  }, 30000);
  beforeEach(async () => {
    for (const table of [
      "CrmOriginJournals",
      "CrmOriginCaptureCommands",
      "ContactTags",
      "ContactCustomFields",
      "Contacts"
    ])
      await database.query(`DELETE FROM ${table}`);
    (TriggerWebhooksService as jest.Mock).mockClear();
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
  const count = async (
    table:
      | "Contacts"
      | "ContactCustomFields"
      | "ContactTags"
      | "CrmOriginJournals"
      | "CrmOriginCaptureCommands"
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
  const latest = () =>
    CrmOriginJournal.findOne({ order: [["createdAt", "DESC"]] });

  it("real producer commits contact extraInfo tags and R09 intent together", async () => {
    const request = input();
    const contact = await CreateContactService(request, context());
    expect(contact.name).toBe(request.name);
    expect(contact.extraInfo[0].value).toBe("Synthetic Value");
    expect(contact.tags.map(tag => tag.id)).toEqual([1]);
    const journal = (await latest())!;
    expect(journal.sourceContactId).toBe(String(contact.id));
    expect(JSON.parse(journal.canonicalBody)).toMatchObject({
      operation: "upsert_contact",
      source_revision: 1
    });
    expect(journal.state).toBe("intent_persisted");
    expect(journal.commercialOperation).toBe("not_requested");
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("legacy webhook starts only after source and journal are visible outside transaction", async () => {
    const observer = require("mysql2/promise");
    const probe = await observer.createConnection({
      host: "127.0.0.1",
      port: 55442,
      user: "root",
      password: "",
      database: "r11_source_lab"
    });
    const visible: number[] = [];
    (TriggerWebhooksService as jest.Mock).mockImplementationOnce(async () => {
      const [rows] = await probe.query(
        "SELECT (SELECT COUNT(*) FROM Contacts)+(SELECT COUNT(*) FROM CrmOriginJournals) AS total"
      );
      visible.push(Number(rows[0].total));
    });
    try {
      await CreateContactService(input(), context());
      await Promise.all(
        (TriggerWebhooksService as jest.Mock).mock.results.map(
          result => result.value
        )
      );
      expect(visible).toEqual([2]);
    } finally {
      await probe.end();
    }
  });
  it("journal failure rolls back contact extraInfo and tags with zero webhook", async () => {
    await database.query(
      "CREATE TRIGGER r11_fault BEFORE INSERT ON CrmOriginJournals FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_journal_fault'"
    );
    try {
      await expect(CreateContactService(input(), context())).rejects.toThrow(
        "synthetic_journal_fault"
      );
    } finally {
      await database.query("DROP TRIGGER r11_fault");
    }
    for (const table of [
      "Contacts",
      "ContactCustomFields",
      "ContactTags",
      "CrmOriginJournals",
      "CrmOriginCaptureCommands"
    ] as const)
      expect(await count(table)).toBe(0);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  });
  it("tag failure cannot leave a contact or journal", async () => {
    await database.query(
      "CREATE TRIGGER r11_fault BEFORE INSERT ON ContactTags FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_tag_fault'"
    );
    try {
      await expect(CreateContactService(input(), context())).rejects.toThrow(
        "synthetic_tag_fault"
      );
    } finally {
      await database.query("DROP TRIGGER r11_fault");
    }
    expect(await count("Contacts")).toBe(0);
    expect(await count("ContactCustomFields")).toBe(0);
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  });
  it("source failure leaves no intent", async () => {
    await database.query(
      "CREATE TRIGGER r11_fault BEFORE INSERT ON Contacts FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_source_fault'"
    );
    try {
      await expect(CreateContactService(input(), context())).rejects.toThrow(
        "synthetic_source_fault"
      );
    } finally {
      await database.query("DROP TRIGGER r11_fault");
    }
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  });
  it("failure after journal insert before commit rolls back all producer writes", async () => {
    await database.query(
      "CREATE TRIGGER r11_fault BEFORE UPDATE ON CrmOriginCaptureCommands FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_precommit_fault'"
    );
    try {
      await expect(CreateContactService(input(), context())).rejects.toThrow(
        "synthetic_precommit_fault"
      );
    } finally {
      await database.query("DROP TRIGGER r11_fault");
    }
    for (const table of [
      "Contacts",
      "ContactCustomFields",
      "ContactTags",
      "CrmOriginJournals",
      "CrmOriginCaptureCommands"
    ] as const)
      expect(await count(table)).toBe(0);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  });
  it("replay preserves event body hash revision and associations without webhook replay", async () => {
    const source = context();
    const first = await CreateContactService(input(), source);
    const original = (await latest())!.get({ plain: true });
    const replay = await CreateContactService(input(), source);
    expect(replay.id).toBe(first.id);
    expect((await latest())!.get({ plain: true })).toEqual(original);
    expect(await count("Contacts")).toBe(1);
    expect(await count("ContactCustomFields")).toBe(1);
    expect(await count("ContactTags")).toBe(1);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("same key with changed extraInfo or tags conflicts before any source write", async () => {
    const source = context();
    await CreateContactService(input(), source);
    await expect(
      CreateContactService(
        {
          ...input(),
          extraInfo: [{ name: "Synthetic Field", value: "Changed" }]
        },
        source
      )
    ).rejects.toThrow("ORIGIN_CAPTURE_KEY_CONFLICT");
    await expect(
      CreateContactService({ ...input(), tagIds: [] }, source)
    ).rejects.toThrow("ORIGIN_CAPTURE_KEY_CONFLICT");
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("same-key concurrent creations return one canonical contact/event", async () => {
    const source = context();
    const contacts = await Promise.all([
      CreateContactService(input(), source),
      CreateContactService(input(), source)
    ]);
    expect(contacts[0].id).toBe(contacts[1].id);
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("different commands for existing number retain legacy duplicate rejection", async () => {
    await CreateContactService(input(), context());
    await expect(
      CreateContactService(input(), context())
    ).rejects.toMatchObject({
      message: "ERR_DUPLICATED_CONTACT",
      statusCode: 400
    });
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(await count("CrmOriginCaptureCommands")).toBe(1);
  });
  it("concurrent different commands cannot commit duplicate contact or orphan intent", async () => {
    const results = await Promise.all(
      [
        CreateContactService(input(), context()),
        CreateContactService(input(), context())
      ].map(operation =>
        operation.then(
          () => true,
          () => false
        )
      )
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(await count("CrmOriginCaptureCommands")).toBe(1);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("off or missing second argument retains creation and webhook but never journal", async () => {
    await CreateContactService(input());
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
    await CreateContactService(
      { ...input(), number: "12025550102" },
      { ...context(), enabled: false }
    );
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(2);
  });
  it("nontransactional journal engine blocks opt-in before mutation but not legacy default", async () => {
    await database
      .getQueryInterface()
      .removeIndex("CrmOriginJournals", "crm_origin_pending_scope");
    try {
      await database.query("ALTER TABLE CrmOriginJournals ENGINE=MyISAM");
      await expect(CreateContactService(input(), context())).rejects.toThrow(
        "SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL"
      );
      expect(await count("Contacts")).toBe(0);
      expect(await count("CrmOriginCaptureCommands")).toBe(0);
      expect(TriggerWebhooksService).not.toHaveBeenCalled();
      await CreateContactService(input());
      expect(await count("Contacts")).toBe(1);
    } finally {
      await database.query("ALTER TABLE CrmOriginJournals ENGINE=InnoDB");
      await database
        .getQueryInterface()
        .addIndex(
          "CrmOriginJournals",
          ["sourceInstanceId", "integrationId", "organizationId", "state"],
          { name: "crm_origin_pending_scope" }
        );
    }
  });
  it("request body cannot enable a source context passed only server-side", async () => {
    await CreateContactService(
      Object.assign(input(), {
        sourceContext: context(),
        enabled: true,
        identity
      })
    );
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(await count("CrmOriginCaptureCommands")).toBe(0);
  });
  it.each([
    "history",
    "echo",
    "outbound",
    "reconciliation",
    "ack",
    "unknown"
  ] as const)("provenance %s creates no cadastral intent", async kind => {
    const source = context();
    await CreateContactService(input(), {
      ...source,
      context: {
        ...source.context,
        channel: "whatsapp_inbound",
        provenance: "realtime"
      },
      metadata: { messageProvenance: { kind, provider: "wwebjs" } }
    });
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("missing metadata and group/fromMe/unauthorized cannot generate intent", async () => {
    const inbound = context();
    await CreateContactService(
      { ...input(), number: "12025550100" },
      {
        ...inbound,
        phoneE164: "+12025550100",
        context: {
          ...inbound.context,
          channel: "whatsapp_inbound",
          provenance: "realtime"
        }
      }
    );
    for (const [index, flags] of [
      { isGroup: true },
      { fromMe: true },
      { authorized: false }
    ].entries()) {
      const source = context();
      const suffix = index + 1;
      await CreateContactService(
        { ...input(), number: `1202555010${suffix}` },
        {
          ...source,
          phoneE164: `+1202555010${suffix}`,
          context: { ...source.context, ...flags }
        }
      );
    }
    expect(await count("CrmOriginJournals")).toBe(0);
  });
  it("unresolved phone remains pending; no fictitious CRM event", async () => {
    await CreateContactService(input(), { ...context(), phoneE164: null });
    expect(await count("CrmOriginJournals")).toBe(0);
    expect(
      JSON.parse((await CrmOriginCaptureCommand.findOne())!.outcome!).intent
    ).toBe("pending_identity");
  });
  it("unbridged update preserves associations and existing event bytes/revision", async () => {
    const created = await CreateContactService(input(), context());
    const original = (await latest())!.get({ plain: true });
    const updated = await UpdateContactService({
      contactId: String(created.id),
      contactData: { name: "Synthetic Updated", city: "Synthetic City" }
    });
    expect(updated.name).toBe("Synthetic Updated");
    expect(updated.tags[0].id).toBe(1);
    expect((await latest())!.get({ plain: true })).toEqual(original);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(2);
  });
  it("does not merge LID/other contact or modify tickets during collision", async () => {
    const lid = await ContactFixture.create({
      name: "Synthetic LID",
      number: null,
      lid: "synthetic@lid"
    });
    const before = await database.query("SELECT * FROM Tickets", {
      type: QueryTypes.SELECT
    });
    await CreateContactService(input(), context());
    await expect(
      CreateContactService(input(), context())
    ).rejects.toMatchObject({
      message: "ERR_DUPLICATED_CONTACT",
      statusCode: 400
    });
    expect((await ContactFixture.findByPk(lid.id))!.lid).toBe("synthetic@lid");
    expect(
      await database.query("SELECT * FROM Tickets", { type: QueryTypes.SELECT })
    ).toEqual(before);
    expect(await count("Contacts")).toBe(2);
  });
  it("R10 default writer stays compatible when no source callback is supplied", async () => {
    const source = context();
    const store = new SequelizeCrmOriginJournalRepository(
      database,
      ContactFixture
    );
    const service = new CrmOriginJournalService(store, {
      enabled: true,
      identity
    });
    const outcome = await service.capture({
      captureKey: source.captureKey,
      correlationId: source.correlationId,
      phoneE164: source.phoneE164,
      bindingStatus: source.bindingStatus,
      context: source.context,
      mutation: {
        kind: "create",
        data: { name: "Synthetic R10", number: "12025550101", isGroup: false }
      }
    });
    expect(outcome.intent).toBe("persisted");
    expect(await count("Contacts")).toBe(1);
    expect(await count("CrmOriginJournals")).toBe(1);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  });
});
