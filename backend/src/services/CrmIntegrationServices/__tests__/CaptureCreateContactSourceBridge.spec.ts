import { randomUUID } from "crypto";
import CaptureCreateContactSourceBridge from "../CaptureCreateContactSourceBridge";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";
import {
  OriginCaptureOutcome,
  OriginJournalEntry,
  OriginJournalUnitOfWork
} from "../CrmOriginJournalService";

jest.mock("../SequelizeCrmOriginJournalRepository");
const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const context = () => ({
  enabled: true,
  identity,
  captureKey: randomUUID(),
  correlationId: randomUUID(),
  phoneE164: "+12025550101",
  bindingStatus: "not_linked" as const,
  context: {
    channel: "manual" as const,
    provenance: "manual" as const,
    authorized: true,
    fromMe: false,
    isGroup: false
  }
});
const setup = (replay: OriginCaptureOutcome | null = null) => {
  const entries: OriginJournalEntry[] = [];
  const transaction = { id: "synthetic-transaction" };
  const unit: OriginJournalUnitOfWork = {
    lockCommand: jest.fn(async () => replay),
    mutateContact: jest.fn(),
    latest: jest.fn(async () => null),
    insert: jest.fn(async entry => {
      entries.push(entry);
    }),
    completeCommand: jest.fn(async () => undefined)
  };
  (SequelizeCrmOriginJournalRepository as jest.Mock).mockImplementation(() => ({
    transaction: async (work: any, mutate: any) => {
      unit.mutateContact = mutation => mutate(mutation, transaction);
      return work(unit);
    }
  }));
  const contact = {
    get: () => ({
      id: 1,
      name: "Synthetic Contact",
      number: "12025550101",
      isGroup: false
    })
  };
  const model = {
    sequelize: {
      query: jest.fn(async () =>
        [
          "Contacts",
          "ContactCustomFields",
          "ContactTags",
          "CrmOriginJournals",
          "CrmOriginCaptureCommands"
        ].map(tableName => ({ tableName, engine: "InnoDB", caseMode: 0 }))
      )
    },
    findByPk: jest.fn(async () => contact)
  };
  const persist = jest.fn(async () => contact);
  return { entries, unit, transaction, model, persist, contact };
};
it("delegates original source writer to the exact R10 transaction and envelope", async () => {
  const value = setup();
  const result = await CaptureCreateContactSourceBridge(
    value.model as any,
    context(),
    {
      name: "Synthetic Contact",
      number: "12025550101",
      extraInfo: [],
      tagIds: [1]
    },
    value.persist as any
  );
  expect(value.persist).toHaveBeenCalledWith(value.transaction);
  expect(result.created).toBe(true);
  expect(value.entries).toHaveLength(1);
  expect(JSON.parse(value.entries[0].canonicalBody).operation).toBe(
    "upsert_contact"
  );
  expect(
    JSON.parse(value.entries[0].canonicalBody).data.extraInfo
  ).toBeUndefined();
});
it("replays committed command without calling source writer again", async () => {
  const value = setup({
    source: "committed",
    contactId: 1,
    intent: "persisted",
    eventId: randomUUID(),
    reason: "contact_created"
  });
  const result = await CaptureCreateContactSourceBridge(
    value.model as any,
    context(),
    { name: "Synthetic Contact", number: "12025550101" },
    value.persist as any
  );
  expect(value.persist).not.toHaveBeenCalled();
  expect(result.created).toBe(false);
  expect(value.model.findByPk).toHaveBeenCalledWith(1, {
    include: ["extraInfo", "tags"]
  });
});
it("failed source writer cannot insert intent or complete command", async () => {
  const value = setup();
  value.persist.mockRejectedValue(new Error("synthetic_source_failed"));
  await expect(
    CaptureCreateContactSourceBridge(
      value.model as any,
      context(),
      { name: "Synthetic Contact", number: "12025550101" },
      value.persist as any
    )
  ).rejects.toThrow("synthetic_source_failed");
  expect(value.unit.insert).not.toHaveBeenCalled();
  expect(value.unit.completeCommand).not.toHaveBeenCalled();
});
it("missing or nontransactional schema rejects before the source writer", async () => {
  const value = setup();
  value.model.sequelize.query.mockResolvedValue([]);
  await expect(
    CaptureCreateContactSourceBridge(
      value.model as any,
      context(),
      { name: "Synthetic Contact", number: "12025550101" },
      value.persist as any
    )
  ).rejects.toThrow("SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL");
  expect(value.persist).not.toHaveBeenCalled();
  expect(value.unit.insert).not.toHaveBeenCalled();
});
it("table case follows server mode rather than accepting an unrelated case-sensitive table", async () => {
  const value = setup();
  const tables = [
    "Contacts",
    "ContactCustomFields",
    "ContactTags",
    "CrmOriginJournals",
    "CrmOriginCaptureCommands"
  ];
  value.model.sequelize.query.mockResolvedValue(
    tables.map(tableName => ({
      tableName: tableName.toLowerCase(),
      engine: "InnoDB",
      caseMode: 0
    }))
  );
  await expect(
    CaptureCreateContactSourceBridge(
      value.model as any,
      context(),
      { name: "Synthetic Contact", number: "12025550101" },
      value.persist as any
    )
  ).rejects.toThrow("SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL");
  value.model.sequelize.query.mockResolvedValue(
    tables.map(tableName => ({
      tableName: tableName.toLowerCase(),
      engine: "InnoDB",
      caseMode: 1
    }))
  );
  expect(
    (
      await CaptureCreateContactSourceBridge(
        value.model as any,
        context(),
        { name: "Synthetic Contact", number: "12025550101" },
        value.persist as any
      )
    ).created
  ).toBe(true);
});
