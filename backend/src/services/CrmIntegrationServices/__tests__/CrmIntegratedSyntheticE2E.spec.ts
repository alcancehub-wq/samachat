import "reflect-metadata";
import { randomBytes, randomUUID, createHash, createHmac } from "crypto";
import { Sequelize } from "sequelize-typescript";
import {
  ContactFixture,
  InfoFixture,
  InitializeContactSourceBridgeLab
} from "./fixtures/ContactSourceBridgeLab";
import {
  crmIdentity,
  GatewayLab,
  InitializeCrmIntegratedGatewayLab,
  webApi
} from "./fixtures/CrmIntegratedGatewayLab";
import CreateContactService from "../../ContactServices/CreateContactService";
import UpdateContactService from "../../ContactServices/UpdateContactService";
import { UpdateContactSourceContext } from "../CaptureUpdateContactSourceBridge";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginCaptureCommand from "../../../models/CrmOriginCaptureCommand";
import TriggerWebhooksService from "../../WebhookServices/TriggerWebhooksService";
import CrmDeliveryCoordinator from "../CrmDeliveryCoordinator";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";
import { CrmM2mAttempt } from "../CrmM2mClient";
let mockContact: typeof ContactFixture;
let mockInfo: typeof InfoFixture;
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
const identity = {
  integrationId: crmIdentity.id,
  organizationId: crmIdentity.org_id,
  sourceInstanceId: crmIdentity.source_instance_id
};
const source = (): UpdateContactSourceContext => ({
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
const input = () => ({
  name: "Synthetic Contact",
  number: "12025550101",
  captureChannel: "Synthetic Manual",
  extraInfo: [{ name: "Synthetic Field", value: "Synthetic Value" }],
  tagIds: [1]
});
const lab =
  process.env.CRM_INTEGRATED_LAB_ENABLED === "1" ? describe : describe.skip;
lab(
  "R14 actual source -> coordinator/HMAC -> immutable CRM gateway -> SQL receipts",
  () => {
    let database: Sequelize;
    let gateway: GatewayLab;
    let repository: SequelizeCrmOriginJournalRepository;
    let now: Date;
    let httpsRequest: jest.SpyInstance;
    let httpRequest: jest.SpyInstance;
    const secret = randomBytes(32);
    const transport: NonNullable<CrmM2mAttempt["transport"]> = async wire => {
      const response = await gateway.handle(
        new webApi.Request(wire.url, {
          method: "POST",
          headers: wire.headers,
          body: wire.body
        })
      );
      return { status: response.status, body: await response.json() };
    };
    const coordinator = (wire = transport, store = repository) =>
      new CrmDeliveryCoordinator(
        store,
        {
          enabled: true,
          identity,
          m2m: {
            endpoint: "https://synthetic.invalid/m2m",
            approvedEndpoint: "https://synthetic.invalid/m2m",
            keyId: crmIdentity.key_id,
            secret
          },
          transport: wire
        },
        () => now
      );
    beforeAll(async () => {
      now = new Date("2026-10-03T15:00:00.000Z");
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
      database = await InitializeContactSourceBridgeLab();
      mockContact = ContactFixture;
      mockInfo = InfoFixture;
      repository = new SequelizeCrmOriginJournalRepository(
        database,
        ContactFixture
      );
      gateway = await InitializeCrmIntegratedGatewayLab(secret, () => +now);
    }, 30000);
    beforeEach(async () => {
      now = new Date("2026-10-03T15:00:00.000Z");
      for (const table of [
        "CrmOriginJournals",
        "CrmOriginCaptureCommands",
        "ContactTags",
        "ContactCustomFields",
        "Contacts"
      ])
        await database.query(`DELETE FROM ${table}`);
      await gateway.reset();
      (TriggerWebhooksService as jest.Mock).mockClear();
    });
    afterEach(async () => {
      expect(httpsRequest).not.toHaveBeenCalled();
      expect(httpRequest).not.toHaveBeenCalled();
      if (gateway)
        for (const table of [
          "deals",
          "deal_opportunities",
          "deal_opportunity_roots",
          "deal_opportunity_events"
        ])
          expect(
            Number(
              (
                await gateway.connection.query(
                  `SELECT count(*) AS total FROM ${table}`
                )
              ).rows[0].total
            )
          ).toBe(0);
    });
    afterAll(async () => {
      httpsRequest?.mockRestore();
      httpRequest?.mockRestore();
      if (gateway) await gateway.connection.end();
      if (database) await database.close();
    });
    const assertRoundtrip = async (eventId: string, contactId: number) => {
      const maria = await require("mysql2/promise").createConnection({
        host: "127.0.0.1",
        port: 55445,
        user: "root",
        password: "",
        database: "r14_source_lab"
      });
      const pg = await gateway.connect();
      try {
        const [metadata] = await maria.query(
          "SELECT DATABASE() AS database,@@datadir AS directory,@@port AS port,@@bind_address AS host,VERSION() AS version"
        );
        expect(metadata[0]).toMatchObject({
          database: "r14_source_lab",
          port: 55445,
          host: "127.0.0.1"
        });
        expect(
          String(metadata[0].directory).replace(/\\/g, "/").toLowerCase()
        ).toBe(
          "d:/samacon/worktrees/samachat-crm-p02-r14-integrated-e2e-20261003/backend/node_modules/.cache/r14-integrated-lab/mariadb-data/"
        );
        expect(String(metadata[0].version).startsWith("10.11.10-MariaDB")).toBe(
          true
        );
        const [rows] = await maria.query(
          "SELECT * FROM CrmOriginJournals WHERE eventId=?",
          [eventId]
        );
        const local = rows[0];
        const remote = (
          await pg.query(
            "SELECT receipt.result,binding.contact_id,binding.source_revision,binding.org_id,binding.source_contact_id,binding.source_instance_id FROM samachat_m2m_receipts receipt JOIN samachat_m2m_bindings binding ON binding.contact_id=(receipt.result->'contact_result'->>'crm_contact_id')::uuid WHERE receipt.event_id=$1",
            [eventId]
          )
        ).rows[0];
        expect(local.state).toBe("contact_confirmed");
        expect(local.sourceContactId).toBe(String(contactId));
        expect(local.bodyHash).toBe(
          createHash("sha256").update(local.canonicalBody, "utf8").digest("hex")
        );
        expect(remote.result.event_id).toBe(eventId);
        expect(remote.result.receipt_id).toBe(
          JSON.parse(local.receipt).receipt_id
        );
        expect(remote.source_contact_id).toBe(String(contactId));
        expect(remote.source_instance_id).toBe(identity.sourceInstanceId);
        expect(remote.org_id).toBe(identity.organizationId);
        expect(Number(remote.source_revision)).toBe(
          Number(local.sourceRevision)
        );
        expect(remote.result.commercial_result).toEqual({
          status: "not_requested",
          primary_deal_id: null,
          opportunity_id: null
        });
        expect(
          Number(
            (await pg.query("SELECT count(*) AS total FROM contacts")).rows[0]
              .total
          )
        ).toBe(1);
        for (const table of [
          "deals",
          "deal_opportunities",
          "deal_opportunity_roots",
          "deal_opportunity_events"
        ])
          expect(
            Number(
              (await pg.query(`SELECT count(*) AS total FROM ${table}`)).rows[0]
                .total
            )
          ).toBe(0);
        return { local, remote };
      } finally {
        await maria.end();
        await pg.end();
      }
    };
    it("A creation source/journal actually roundtrips to canonical CRM contact/binding/receipt", async () => {
      const contact = await CreateContactService(input(), source());
      const event = (await CrmOriginJournal.findOne())!;
      const body = event.canonicalBody;
      expect(event.sourceContactId).toBe(String(contact.id));
      expect(event.state).toBe("intent_persisted");
      expect(contact.tags[0].id).toBe(1);
      expect((await coordinator().runOnce(identity)).state).toBe(
        "contact_confirmed"
      );
      const result = await assertRoundtrip(event.eventId, contact.id);
      expect(result.local.canonicalBody).toBe(body);
      expect(gateway.rpcCalls.upsert).toBe(1);
      expect(gateway.rpcCalls.readback).toBe(0);
    });
    it("B real source update increments revision and reuses CRM binding without overwriting curated name", async () => {
      const contact = await CreateContactService(input(), source());
      const first = (await CrmOriginJournal.findOne())!;
      await coordinator().runOnce(identity);
      const before = await assertRoundtrip(first.eventId, contact.id);
      const crmContactId = before.remote.contact_id;
      const adapter = jest.spyOn(
        require("../AdaptCrmContactIntentService"),
        "default"
      );
      try {
        await UpdateContactService(
          {
            contactId: String(contact.id),
            contactData: {
              name: "Synthetic Source Enriched",
              captureChannel: "Synthetic New Channel"
            }
          },
          { ...source(), bindingStatus: "linked" }
        );
        const observed = (adapter.mock.calls[0] as any)[0];
        expect(observed.previousContact).toMatchObject({
          id: contact.id,
          isGroup: false,
          name: "Synthetic Contact"
        });
        expect(observed.contact).toMatchObject({
          id: contact.id,
          isGroup: false,
          name: "Synthetic Source Enriched"
        });
      } finally {
        adapter.mockRestore();
      }
      const second = (await CrmOriginJournal.findOne({
        order: [["sourceRevision", "DESC"]]
      }))!;
      expect(Number(second.sourceRevision)).toBe(2);
      expect((await coordinator().runOnce(identity)).state).toBe(
        "contact_confirmed"
      );
      const after = await assertRoundtrip(second.eventId, contact.id);
      expect(after.remote.contact_id).toBe(crmContactId);
      expect(
        (
          await gateway.connection.query(
            "SELECT first_name,capture_channel FROM contacts WHERE id=$1",
            [crmContactId]
          )
        ).rows[0]
      ).toEqual({
        first_name: "Synthetic Contact",
        capture_channel: "Synthetic Manual"
      });
      expect(
        Number(
          (
            await gateway.connection.query(
              "SELECT count(*) AS total FROM samachat_m2m_bindings"
            )
          ).rows[0].total
        )
      ).toBe(1);
    });
    it("C gateway commit followed by lost response recovers original durable receipt through readback", async () => {
      const contact = await CreateContactService(input(), source());
      const entry = (await CrmOriginJournal.findOne())!;
      const original = entry.canonicalBody;
      const lost: NonNullable<CrmM2mAttempt["transport"]> = async wire => {
        await transport(wire);
        throw new Error("synthetic_lost_response_after_gateway_commit");
      };
      expect((await coordinator(lost).runOnce(identity)).state).toBe(
        "reconciliation_required"
      );
      const receipt = (
        await gateway.connection.query(
          "SELECT result FROM samachat_m2m_receipts WHERE event_id=$1",
          [entry.eventId]
        )
      ).rows[0].result;
      expect(receipt.contact_result.crm_contact_id).toBeTruthy();
      now = new Date(+now + 61000);
      const restored = new SequelizeCrmOriginJournalRepository(
        database,
        ContactFixture
      );
      const result = await coordinator(transport, restored).runOnce(identity);
      expect(result).toMatchObject({
        state: "contact_confirmed",
        operation: "get_receipt",
        eventId: entry.eventId
      });
      const roundtrip = await assertRoundtrip(entry.eventId, contact.id);
      expect(roundtrip.remote.result.receipt_id).toBe(receipt.receipt_id);
      expect(roundtrip.local.canonicalBody).toBe(original);
      expect(gateway.rpcCalls.upsert).toBe(1);
      expect(gateway.rpcCalls.readback).toBe(1);
      expect(await CrmOriginJournal.count()).toBe(1);
    });
    it("D repeated source command keeps original event/result and does not redeliver confirmed work", async () => {
      const request = source();
      const first = await CreateContactService(input(), request);
      const entry = (await CrmOriginJournal.findOne())!;
      await coordinator().runOnce(identity);
      const confirmed = (await repository.read(identity, entry.eventId))!;
      const replay = await CreateContactService(input(), request);
      expect(replay.id).toBe(first.id);
      expect(await repository.read(identity, entry.eventId)).toEqual(confirmed);
      expect((await coordinator().runOnce(identity)).state).toBe("idle");
      expect(gateway.rpcCalls.upsert).toBe(1);
      expect(TriggerWebhooksService).toHaveBeenCalledTimes(1);
      await expect(
        CreateContactService({ ...input(), name: "Divergent" }, request)
      ).rejects.toThrow("ORIGIN_CAPTURE_KEY_CONFLICT");
      expect(await ContactFixture.count()).toBe(1);
      expect(await CrmOriginJournal.count()).toBe(1);
      await assertRoundtrip(entry.eventId, first.id);
    });
    it("D update replay after later mutation returns original response without repeating delivery", async () => {
      const contact = await CreateContactService(input(), source());
      await coordinator().runOnce(identity);
      const request = { ...source(), bindingStatus: "linked" as const };
      const data = {
        name: "Synthetic First Update",
        extraInfo: [],
        tagIds: []
      };
      const first = await UpdateContactService(
        { contactId: String(contact.id), contactData: data },
        request
      );
      const original = JSON.stringify(first.get({ plain: true }));
      await coordinator().runOnce(identity);
      await UpdateContactService(
        {
          contactId: String(contact.id),
          contactData: { name: "Synthetic Later Update" }
        },
        { ...source(), bindingStatus: "linked" }
      );
      await coordinator().runOnce(identity);
      const replay = await UpdateContactService(
        { contactId: String(contact.id), contactData: data },
        request
      );
      expect(JSON.stringify(replay.get({ plain: true }))).toBe(original);
      expect((await ContactFixture.findByPk(contact.id))!.name).toBe(
        "Synthetic Later Update"
      );
      expect((await coordinator().runOnce(identity)).state).toBe("idle");
      expect(gateway.rpcCalls.upsert).toBe(3);
      expect(
        Number(
          (
            await gateway.connection.query(
              "SELECT count(*) AS total FROM contacts"
            )
          ).rows[0].total
        )
      ).toBe(1);
    });
    it("identity uses org installation contactId and never WhatsApp connection or ticket", async () => {
      const contact = await CreateContactService(input(), source());
      const event = (await CrmOriginJournal.findOne())!;
      await coordinator().runOnce(identity);
      const envelope = JSON.parse(event.canonicalBody);
      const requests = [];
      for (const connection of [
        "synthetic-connection-a",
        "synthetic-connection-b"
      ]) {
        const body = JSON.stringify({
          ...envelope,
          event_id: randomUUID(),
          context: { ...envelope.context, whatsapp_connection_id: connection }
        });
        const eventId = JSON.parse(body).event_id;
        const response = await gateway.handle(
          new webApi.Request("https://synthetic.invalid/m2m", {
            method: "POST",
            body,
            headers: {
              "Content-Type": "application/json",
              "X-SamaChat-Signature-Version": "1",
              "X-SamaChat-Key-Id": crmIdentity.key_id,
              "X-SamaChat-Sent-At": now.toISOString(),
              "X-SamaChat-Event-Id": eventId,
              "X-SamaChat-Signature": createHmac("sha256", secret)
                .update(`${now.toISOString()}\n${eventId}\n${body}`)
                .digest("hex")
            }
          })
        );
        expect(response.status).toBe(200);
        requests.push(
          ((await response.json()) as any).contact_result.crm_contact_id
        );
      }
      expect(requests[0]).toBe(requests[1]);
      expect(
        Number(
          (
            await gateway.connection.query(
              "SELECT count(*) AS total FROM samachat_m2m_bindings"
            )
          ).rows[0].total
        )
      ).toBe(1);
      expect(
        (
          await gateway.connection.query(
            "SELECT source_contact_id,source_instance_id,org_id FROM samachat_m2m_bindings"
          )
        ).rows[0]
      ).toEqual({
        source_contact_id: String(contact.id),
        source_instance_id: identity.sourceInstanceId,
        org_id: identity.organizationId
      });
    });
    it("E bad HMAC is rejected before any PostgreSQL RPC", async () => {
      await CreateContactService(input(), source());
      let status = 0;
      const bad: NonNullable<CrmM2mAttempt["transport"]> = async wire => {
        const result = await transport({
          ...wire,
          headers: { ...wire.headers, "X-SamaChat-Signature": "0".repeat(64) }
        });
        status = result.status;
        return result;
      };
      expect((await coordinator(bad).runOnce(identity)).state).toBe(
        "terminal_failure"
      );
      expect(status).toBe(401);
      expect(gateway.rpcCalls.upsert).toBe(0);
      expect(
        Number(
          (
            await gateway.connection.query(
              "SELECT count(*) AS total FROM contacts"
            )
          ).rows[0].total
        )
      ).toBe(0);
    });
    it.each(["organization_id", "source_instance_id"])(
      "E validly signed divergent %s fails scope before RPC",
      async field => {
        await CreateContactService(input(), source());
        let status = 0;
        const altered: NonNullable<CrmM2mAttempt["transport"]> = async wire => {
          const original = JSON.parse(wire.body);
          const body = JSON.stringify({
            ...original,
            [field]:
              field === "organization_id"
                ? "00000000-0000-4000-8000-000000000002"
                : "other-instance"
          });
          const result = await transport({
            ...wire,
            body,
            headers: {
              ...wire.headers,
              "X-SamaChat-Signature": createHmac("sha256", secret)
                .update(
                  `${wire.headers["X-SamaChat-Sent-At"]}\n${original.event_id}\n${body}`
                )
                .digest("hex")
            }
          });
          status = result.status;
          return result;
        };
        expect((await coordinator(altered).runOnce(identity)).state).toBe(
          "terminal_failure"
        );
        expect(status).toBe(403);
        expect(gateway.rpcCalls.upsert).toBe(0);
      }
    );
    it.each([
      "history",
      "echo",
      "outbound",
      "ack",
      "reconciliation",
      "unknown"
    ] as const)(
      "E %s provenance creates no intent or CRM write",
      async kind => {
        const request = source();
        await CreateContactService(input(), {
          ...request,
          context: {
            ...request.context,
            channel: "whatsapp_inbound",
            provenance: "realtime"
          },
          metadata: { messageProvenance: { kind, provider: "wwebjs" } }
        });
        expect(await CrmOriginJournal.count()).toBe(0);
        expect((await coordinator().runOnce(identity)).state).toBe("idle");
        expect(gateway.rpcCalls.upsert).toBe(0);
        expect(
          Number(
            (
              await gateway.connection.query(
                "SELECT count(*) AS total FROM contacts"
              )
            ).rows[0].total
          )
        ).toBe(0);
      }
    );
    it("E unresolved or incompatible phone creates no fictitious CRM person", async () => {
      await CreateContactService(input(), { ...source(), phoneE164: null });
      await CreateContactService(
        { ...input(), number: "12025550102" },
        source()
      );
      expect(await CrmOriginJournal.count()).toBe(0);
      expect((await coordinator().runOnce(identity)).state).toBe("idle");
      expect(
        Number(
          (
            await gateway.connection.query(
              "SELECT count(*) AS total FROM contacts"
            )
          ).rows[0].total
        )
      ).toBe(0);
      expect(
        (await CrmOriginCaptureCommand.findAll()).every(
          row => JSON.parse(row.outcome!).intent === "pending_identity"
        )
      ).toBe(true);
    });
    it("E identity conflict keeps curated CRM contact and original binding unchanged", async () => {
      const contact = await CreateContactService(input(), source());
      await coordinator().runOnce(identity);
      const before = (await gateway.connection.query("SELECT * FROM contacts"))
        .rows;
      const binding = (
        await gateway.connection.query("SELECT * FROM samachat_m2m_bindings")
      ).rows;
      await UpdateContactService(
        {
          contactId: String(contact.id),
          contactData: { number: "12025550102" }
        },
        { ...source(), phoneE164: "+12025550102", bindingStatus: "linked" }
      );
      expect((await coordinator().runOnce(identity)).state).toBe(
        "reconciliation_required"
      );
      expect(
        (await gateway.connection.query("SELECT * FROM contacts")).rows
      ).toEqual(before);
      expect(
        (await gateway.connection.query("SELECT * FROM samachat_m2m_bindings"))
          .rows
      ).toEqual(binding);
      const receipts = (
        await gateway.connection.query(
          "SELECT result FROM samachat_m2m_receipts"
        )
      ).rows;
      expect(
        receipts.some(row => row.result.error?.code === "identity_conflict")
      ).toBe(true);
    });
    it.each(["ContactTags", "CrmOriginJournals"])(
      "E local %s failure rolls back source and emits no remote work",
      async table => {
        await database.query(
          `CREATE TRIGGER r14_fault BEFORE INSERT ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='synthetic_local_failure'`
        );
        try {
          await expect(CreateContactService(input(), source())).rejects.toThrow(
            "synthetic_local_failure"
          );
        } finally {
          await database.query("DROP TRIGGER r14_fault");
        }
        expect(await ContactFixture.count()).toBe(0);
        expect(await InfoFixture.count()).toBe(0);
        expect(await CrmOriginJournal.count()).toBe(0);
        expect(await CrmOriginCaptureCommand.count()).toBe(0);
        expect((await coordinator().runOnce(identity)).state).toBe("idle");
        expect(gateway.rpcCalls.upsert).toBe(0);
        expect(TriggerWebhooksService).not.toHaveBeenCalled();
      }
    );
    it("E CRM receipt persistence failure atomically rolls back contact and binding", async () => {
      await CreateContactService(input(), source());
      await gateway.connection.query(
        "CREATE FUNCTION r14_receipt_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic_receipt_failure'; END; $$; CREATE TRIGGER r14_receipt_fault BEFORE INSERT ON samachat_m2m_receipts FOR EACH ROW EXECUTE FUNCTION r14_receipt_fault()"
      );
      try {
        expect((await coordinator().runOnce(identity)).state).toBe(
          "reconciliation_required"
        );
      } finally {
        await gateway.connection.query(
          "DROP TRIGGER r14_receipt_fault ON samachat_m2m_receipts; DROP FUNCTION r14_receipt_fault()"
        );
      }
      for (const table of [
        "contacts",
        "samachat_m2m_bindings",
        "samachat_m2m_receipts"
      ])
        expect(
          Number(
            (
              await gateway.connection.query(
                `SELECT count(*) AS total FROM ${table}`
              )
            ).rows[0].total
          )
        ).toBe(0);
      now = new Date(+now + 61000);
      const result = await coordinator().runOnce(identity);
      expect(result).toMatchObject({
        state: "reconciliation_required",
        operation: "get_receipt",
        code: "receipt_not_found_inconclusive"
      });
      expect(gateway.rpcCalls.upsert).toBe(1);
      expect(gateway.rpcCalls.readback).toBe(1);
    });
  }
);
