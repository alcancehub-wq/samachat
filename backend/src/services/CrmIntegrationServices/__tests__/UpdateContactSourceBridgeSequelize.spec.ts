import "reflect-metadata";
import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import {
  ContactFixture,
  InfoFixture,
  InitializeContactSourceBridgeLab
} from "./fixtures/ContactSourceBridgeLab";
import UpdateContactService from "../../ContactServices/UpdateContactService";
import CreateContactService from "../../ContactServices/CreateContactService";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";
import { UpdateContactSourceContext } from "../CaptureUpdateContactSourceBridge";
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
const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const context = (): UpdateContactSourceContext => ({
  enabled: true,
  identity,
  captureKey: randomUUID(),
  correlationId: randomUUID(),
  phoneE164: "+12025550101",
  bindingStatus: "linked",
  context: {
    channel: "manual",
    provenance: "manual",
    authorized: true,
    fromMe: false,
    isGroup: false
  }
});
const laboratory =
  process.env.CRM_UPDATE_BRIDGE_LAB_ENABLED === "1" ? describe : describe.skip;
laboratory("R12 UpdateContactService real SQL", () => {
  let database: Sequelize;
  let contactId: number;
  let infoId: number;
  let httpsRequest: jest.SpyInstance;
  let httpRequest: jest.SpyInstance;
  beforeAll(async () => {
    httpsRequest = jest
      .spyOn(require("https"), "request")
      .mockImplementation(() => {
        throw new Error("HTTP_FORBIDDEN");
      });
    httpRequest = jest
      .spyOn(require("http"), "request")
      .mockImplementation(() => {
        throw new Error("HTTP_FORBIDDEN");
      });
    database = await InitializeContactSourceBridgeLab();
    mockContact = ContactFixture;
    mockExtraInfo = InfoFixture;
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
    const created = await CreateContactService(
      {
        name: "Synthetic Before",
        number: "12025550101",
        captureChannel: "Synthetic Channel",
        email: "synthetic@example.invalid",
        extraInfo: [{ name: "Synthetic Field", value: "Before" }],
        tagIds: [1]
      },
      { ...context(), bindingStatus: "not_linked" }
    );
    contactId = created.id;
    infoId = created.extraInfo[0].id;
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
  const update = (contactData: any, source = context()) =>
    UpdateContactService({ contactId: String(contactId), contactData }, source);
  const journals = () =>
    CrmOriginJournal.findAll({ order: [["sourceRevision", "ASC"]] });
  const commands = () => CrmOriginCaptureCommand.count();
  const state = async () =>
    JSON.stringify({
      contacts: (await ContactFixture.findAll({ order: [["id", "ASC"]] })).map(
        row => row.get({ plain: true })
      ),
      info: (await InfoFixture.findAll({ order: [["id", "ASC"]] })).map(row =>
        row.get({ plain: true })
      ),
      tags: await database.query(
        "SELECT * FROM ContactTags ORDER BY contactId,tagId",
        { type: QueryTypes.SELECT }
      ),
      journal: (await journals()).map(row => row.get({ plain: true })),
      command: (
        await CrmOriginCaptureCommand.findAll({
          order: [["captureKey", "ASC"]]
        })
      ).map(row => row.get({ plain: true }))
    });
  const fault = async (
    table: string,
    event: "INSERT" | "UPDATE" | "DELETE",
    run: () => Promise<unknown>
  ) => {
    const before = await state();
    await database.query(
      `CREATE TRIGGER r12_fault BEFORE ${event} ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_fault'`
    );
    try {
      await expect(run()).rejects.toThrow("synthetic_fault");
    } finally {
      await database.query("DROP TRIGGER r12_fault");
    }
    expect(await state()).toBe(before);
    expect(TriggerWebhooksService).not.toHaveBeenCalled();
  };
  it("full before/after name and channel update generates revision2 with canonical id", async () => {
    const result = await update({
      name: "Synthetic After",
      captureChannel: "Synthetic New Channel"
    });
    const rows = await journals();
    expect(result.id).toBe(contactId);
    expect(rows.map(row => Number(row.sourceRevision))).toEqual([1, 2]);
    expect(JSON.parse(rows[1].canonicalBody).data).toMatchObject({
      display_name: "Synthetic After",
      capture_channel: "Synthetic New Channel",
      phone_e164: "+12025550101"
    });
    expect((result.get({ plain: true }) as any).isGroup).toBeUndefined();
    expect(await ContactFixture.count()).toBe(1);
  });
  it("city and ignored photo-only payload create no semantic revision", async () => {
    await update({ city: "Synthetic City", profilePicUrl: "synthetic-photo" });
    expect(await CrmOriginJournal.count()).toBe(1);
    expect((await ContactFixture.findByPk(contactId))!.city).toBe(
      "Synthetic City"
    );
  });
  it("extraInfo addition change and removal share the transaction", async () => {
    await update({
      extraInfo: [
        { id: infoId, name: "Synthetic Field", value: "Changed" },
        { name: "Synthetic New", value: "Added" }
      ]
    });
    expect((await InfoFixture.findByPk(infoId))!.value).toBe("Changed");
    expect(await InfoFixture.count()).toBe(2);
    await update({ extraInfo: [] });
    expect(await InfoFixture.count()).toBe(0);
    expect(await CrmOriginJournal.count()).toBe(1);
  });
  it("tags add replace and empty use original association semantics", async () => {
    await update({ tagIds: [1, 2] });
    expect(
      (await ContactFixture.findByPk(contactId, { include: ["tags"] }))!.tags
        .map(tag => tag.id)
        .sort()
    ).toEqual([1, 2]);
    await update({ tagIds: [2] });
    expect(
      (await ContactFixture.findByPk(contactId, {
        include: ["tags"]
      }))!.tags.map(tag => tag.id)
    ).toEqual([2]);
    await update({ tagIds: [] });
    expect(
      (await ContactFixture.findByPk(contactId, { include: ["tags"] }))!.tags
    ).toHaveLength(0);
  });
  it("absent fields preserve values while explicit null and empty lists clear only provided data", async () => {
    await update({ city: "Synthetic City" });
    await update({ state: "Synthetic State" });
    expect((await ContactFixture.findByPk(contactId))!.city).toBe(
      "Synthetic City"
    );
    expect(await InfoFixture.count()).toBe(1);
    await update({ city: null, extraInfo: [], tagIds: [] });
    expect((await ContactFixture.findByPk(contactId))!.city).toBeNull();
    expect(await InfoFixture.count()).toBe(0);
    expect(
      (await ContactFixture.findByPk(contactId, { include: ["tags"] }))!.tags
    ).toHaveLength(0);
  });
  it("empty name is distinct from absence and does not invent a name", async () => {
    await update({ name: "" });
    expect((await ContactFixture.findByPk(contactId))!.name).toBe("");
    expect(
      JSON.parse((await journals())[1].canonicalBody).data.display_name
    ).toBeNull();
  });
  it("source update failure rolls back command associations and journal", async () => {
    await fault("Contacts", "UPDATE", () =>
      update({ name: "Rejected", extraInfo: [], tagIds: [] })
    );
  });
  it("extraInfo upsert failure rolls back the whole change", async () => {
    await fault("ContactCustomFields", "UPDATE", () =>
      update({
        name: "Rejected",
        extraInfo: [{ id: infoId, name: "Synthetic Field", value: "Rejected" }]
      })
    );
  });
  it("extraInfo removal failure rolls back the whole change", async () => {
    await fault("ContactCustomFields", "DELETE", () =>
      update({ name: "Rejected", extraInfo: [] })
    );
  });
  it("tag write failure rolls back source and extraInfo", async () => {
    await fault("ContactTags", "INSERT", () =>
      update({ name: "Rejected", extraInfo: [], tagIds: [2] })
    );
  });
  it("journal failure rolls back all already written source fields", async () => {
    await fault("CrmOriginJournals", "INSERT", () =>
      update({ name: "Rejected", extraInfo: [], tagIds: [] })
    );
  });
  it("precommit command failure rolls back journal and producer", async () => {
    await fault("CrmOriginCaptureCommands", "UPDATE", () =>
      update({ name: "Rejected", extraInfo: [], tagIds: [] })
    );
  });
  it("replay does not reapply updates removals or webhook and keeps event bytes", async () => {
    const source = context();
    const data = { name: "Synthetic After", extraInfo: [], tagIds: [] };
    await update(data, source);
    const before = await state();
    const result = await update(data, source);
    expect(result.id).toBe(contactId);
    expect(await state()).toBe(before);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("replay returns original projection after a later update without undoing it", async () => {
    const source = context();
    const data = {
      name: "Synthetic Original",
      extraInfo: [{ id: infoId, name: "Synthetic Field", value: "Original" }],
      tagIds: [2]
    };
    const first = await update(data, source);
    const original = JSON.stringify(first.get({ plain: true }));
    await update({ name: "Synthetic Later", extraInfo: [], tagIds: [] });
    const stored = await state();
    const replay = await update(data, source);
    expect(JSON.stringify(replay.get({ plain: true }))).toBe(original);
    expect(await state()).toBe(stored);
    expect((await ContactFixture.findByPk(contactId))!.name).toBe(
      "Synthetic Later"
    );
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(2);
  });
  it("same key divergent name extraInfo or tags rejects before write", async () => {
    const source = context();
    await update({ name: "Synthetic After" }, source);
    const before = await state();
    for (const data of [
      { name: "Other" },
      { name: "Synthetic After", extraInfo: [] },
      { name: "Synthetic After", tagIds: [] }
    ])
      await expect(update(data, source)).rejects.toThrow(
        "ORIGIN_CAPTURE_KEY_CONFLICT"
      );
    expect(await state()).toBe(before);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("same key cannot change previous phone evidence without conflict", async () => {
    const source = { ...context(), previousPhoneE164: "+12025550101" };
    await update({ name: "Synthetic After" }, source);
    const before = await state();
    await expect(
      update(
        { name: "Synthetic After" },
        { ...source, previousPhoneE164: null }
      )
    ).rejects.toThrow("ORIGIN_CAPTURE_KEY_CONFLICT");
    expect(await state()).toBe(before);
  });
  it("two concurrent updates serialize before snapshots and revisions", async () => {
    await Promise.all([
      update({ name: "Synthetic A" }),
      update({ name: "Synthetic B" })
    ]);
    expect((await journals()).map(row => Number(row.sourceRevision))).toEqual([
      1, 2, 3
    ]);
    expect(await ContactFixture.count()).toBe(1);
  });
  it("same command concurrently commits once and triggers one webhook", async () => {
    const source = context();
    await Promise.all([
      update({ name: "Synthetic After" }, source),
      update({ name: "Synthetic After" }, source)
    ]);
    expect(await CrmOriginJournal.count()).toBe(2);
    expect(await commands()).toBe(2);
    expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
  });
  it("missing contact produces no orphan command", async () => {
    await expect(
      UpdateContactService(
        { contactId: "999999", contactData: { name: "Missing" } },
        context()
      )
    ).rejects.toMatchObject({
      message: "ERR_NO_CONTACT_FOUND",
      statusCode: 404
    });
    expect(await commands()).toBe(1);
    expect(await CrmOriginJournal.count()).toBe(1);
  });
  it("different integration cannot bypass identity guard via irrelevant update", async () => {
    const before = await state();
    await expect(
      update(
        { city: "Rejected" },
        { ...context(), identity: { ...identity, integrationId: "other" } }
      )
    ).rejects.toThrow("ORIGIN_TARGET_IDENTITY_CONFLICT");
    expect(await state()).toBe(before);
  });
  it("different organization cannot mutate the same source identity", async () => {
    const before = await state();
    await expect(
      update(
        { name: "Rejected" },
        {
          ...context(),
          identity: { ...identity, organizationId: randomUUID() }
        }
      )
    ).rejects.toThrow("ORIGIN_TARGET_IDENTITY_CONFLICT");
    expect(await state()).toBe(before);
  });
  it("extraInfo id belonging to another contact cannot be reassigned", async () => {
    const other = await ContactFixture.create({
      name: "Synthetic Other",
      number: "12025550102",
      isGroup: false
    });
    const otherInfo = await InfoFixture.create({
      name: "Synthetic Other Info",
      value: "Curated",
      contactId: other.id
    });
    const before = await state();
    await expect(
      update({
        name: "Rejected",
        extraInfo: [{ id: otherInfo.id, name: "Hijack", value: "Rejected" }]
      })
    ).rejects.toMatchObject({
      message: "ERR_CONTACT_EXTRAINFO_SCOPE",
      statusCode: 409
    });
    expect(await state()).toBe(before);
  });
  it("phone change uses distinct prior proof and matching after phone", async () => {
    const adapter = jest.spyOn(
      require("../AdaptCrmContactIntentService"),
      "default"
    );
    try {
      await update(
        { number: "12025550102" },
        { ...context(), phoneE164: "+12025550102" }
      );
      const observed = (adapter.mock.calls[0] as any)[0];
      expect(observed.previousContact).toMatchObject({
        id: contactId,
        isGroup: false,
        number: "12025550101",
        phoneE164: "+12025550101"
      });
      expect(observed.contact).toMatchObject({
        id: contactId,
        isGroup: false,
        number: "12025550102",
        phoneE164: "+12025550102"
      });
    } finally {
      adapter.mockRestore();
    }
    const rows = await journals();
    expect(JSON.parse(rows[0].canonicalBody).data.phone_e164).toBe(
      "+12025550101"
    );
    expect(JSON.parse(rows[1].canonicalBody).data.phone_e164).toBe(
      "+12025550102"
    );
    expect(rows[1].sourceContactId).toBe(String(contactId));
  });
  it("incompatible phone claim cannot confirm the after identity", async () => {
    await update({ number: "12025550102" });
    expect(await CrmOriginJournal.count()).toBe(1);
    const row = await CrmOriginCaptureCommand.findOne({
      order: [
        ["createdAt", "DESC"],
        ["captureKey", "DESC"]
      ]
    });
    expect((await ContactFixture.findByPk(contactId))!.number).toBe(
      "12025550102"
    );
    expect(
      (await CrmOriginCaptureCommand.findAll()).some(
        command => JSON.parse(command.outcome!).intent === "pending_identity"
      )
    ).toBe(true);
    expect(row).not.toBeNull();
  });
  it("cleared telephone remains pending without fabricated CRM identity", async () => {
    await update({ number: null }, { ...context(), phoneE164: null });
    expect(await CrmOriginJournal.count()).toBe(1);
    expect((await ContactFixture.findByPk(contactId))!.number).toBeNull();
  });
  it("full isGroup snapshot blocks group even when caller claims individual", async () => {
    await ContactFixture.update(
      { isGroup: true },
      { where: { id: contactId } }
    );
    await update({ name: "Synthetic Group" });
    expect(await CrmOriginJournal.count()).toBe(1);
  });
  it.each([
    "history",
    "echo",
    "outbound",
    "reconciliation",
    "ack",
    "unknown"
  ] as const)("origin %s creates no new intent", async kind => {
    const source = context();
    await update(
      { name: "Synthetic After" },
      {
        ...source,
        context: {
          ...source.context,
          channel: "whatsapp_inbound",
          provenance: "realtime"
        },
        metadata: { messageProvenance: { kind, provider: "wwebjs" } }
      }
    );
    expect(await CrmOriginJournal.count()).toBe(1);
  });
  it("missing metadata fromMe and unauthorized remain ineligible", async () => {
    const source = context();
    await update(
      { name: "Synthetic First" },
      {
        ...source,
        context: {
          ...source.context,
          channel: "whatsapp_inbound",
          provenance: "realtime"
        }
      }
    );
    await update(
      { name: "Synthetic Second" },
      { ...context(), context: { ...source.context, fromMe: true } }
    );
    await update(
      { name: "Synthetic Third" },
      { ...context(), context: { ...source.context, authorized: false } }
    );
    expect(await CrmOriginJournal.count()).toBe(1);
  });
  it("default false and body injected context cannot query journal/schema", async () => {
    await UpdateContactService(
      Object.assign(
        { contactId: String(contactId), contactData: { name: "Legacy" } },
        { sourceContext: context(), enabled: true }
      )
    );
    await update({ city: "Legacy City" }, { ...context(), enabled: false });
    expect(await CrmOriginJournal.count()).toBe(1);
    expect(await commands()).toBe(1);
  });
  it("webhook sees committed data from an independent connection and only once", async () => {
    const reader = await require("mysql2/promise").createConnection({
      host: "127.0.0.1",
      port: 55443,
      user: "root",
      password: "",
      database: "r12_update_lab"
    });
    const visible: unknown[] = [];
    (TriggerWebhooksService as jest.Mock).mockImplementationOnce(async () => {
      const [rows] = await reader.query(
        "SELECT name,(SELECT COUNT(*) FROM CrmOriginJournals) AS revisions FROM Contacts WHERE id=?",
        [contactId]
      );
      visible.push(rows[0]);
    });
    try {
      await update({ name: "Committed After" });
      await Promise.all(
        (TriggerWebhooksService as jest.Mock).mock.results.map(
          result => result.value
        )
      );
      expect(visible).toEqual([{ name: "Committed After", revisions: 2 }]);
    } finally {
      await reader.end();
    }
  });
  it("ticket state and separate identity remain untouched", async () => {
    const before = await database.query("SELECT * FROM Tickets", {
      type: QueryTypes.SELECT
    });
    const other = await ContactFixture.create({
      name: "Synthetic Other",
      number: null,
      lid: "synthetic@lid",
      isGroup: false
    });
    await update({ name: "Synthetic After" });
    expect(
      await database.query("SELECT * FROM Tickets", { type: QueryTypes.SELECT })
    ).toEqual(before);
    expect((await ContactFixture.findByPk(other.id))!.lid).toBe(
      "synthetic@lid"
    );
  });
  it("initial sync requirement remains eligible for irrelevant change with no prior journal", async () => {
    await database.query("DELETE FROM CrmOriginJournals");
    await update(
      { city: "Synthetic City" },
      { ...context(), bindingStatus: "not_linked" }
    );
    expect((await journals()).map(row => Number(row.sourceRevision))).toEqual([
      1
    ]);
  });
  it("linked unchanged identity without a local journal does not invent enrichment", async () => {
    await database.query("DELETE FROM CrmOriginJournals");
    await update({ city: "Synthetic City" });
    expect(await CrmOriginJournal.count()).toBe(0);
  });
});
