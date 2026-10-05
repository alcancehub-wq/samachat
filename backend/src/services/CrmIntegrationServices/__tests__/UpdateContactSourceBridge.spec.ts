import { randomUUID } from "crypto";
import CaptureUpdateContactSourceBridge from "../CaptureUpdateContactSourceBridge";
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
  bindingStatus: "linked" as const,
  context: {
    channel: "manual" as const,
    provenance: "manual" as const,
    authorized: true,
    fromMe: false,
    isGroup: false
  }
});
const fixture = (replay: OriginCaptureOutcome | null = null) => {
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
  const before = {
    id: 1,
    name: "Synthetic Before",
    number: "12025550101",
    isGroup: false,
    phoneE164: "+12025550101"
  };
  const after = { ...before, name: "Synthetic After" };
  const contact = { get: () => ({ id: 1, name: "Synthetic After" }) };
  const persist = jest.fn(async () => ({ contact, before, after }));
  const reload = jest.fn(async () => contact);
  const model = {
    build: jest.fn(() => contact),
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
    }
  };
  return { entries, unit, transaction, persist, reload, model, before, after };
};
it("uses producer before/after in the same managed transaction", async () => {
  const value = fixture();
  const result = await CaptureUpdateContactSourceBridge(
    value.model as any,
    context(),
    "1",
    { contactData: { name: "Synthetic After" } },
    value.persist as any,
    value.reload as any
  );
  expect(value.persist).toHaveBeenCalledWith(value.transaction);
  expect(result.updated).toBe(true);
  expect(value.entries[0].sourceContactId).toBe("1");
  expect(JSON.parse(value.entries[0].canonicalBody).data.display_name).toBe(
    "Synthetic After"
  );
});
it("unchanged explicit phone snapshots do not manufacture enrichment", async () => {
  const value = fixture();
  value.persist.mockResolvedValue({
    contact: { get: () => ({ id: 1 }) },
    before: value.before,
    after: value.before
  } as any);
  await CaptureUpdateContactSourceBridge(
    value.model as any,
    context(),
    "1",
    { contactData: { city: "Synthetic City" } },
    value.persist as any,
    value.reload as any
  );
  expect(value.entries).toHaveLength(0);
});
it("explicit unresolved after phone cannot be overwritten by a request claim", async () => {
  const value = fixture();
  value.persist.mockResolvedValue({
    contact: { get: () => ({ id: 1 }) },
    before: value.before,
    after: { ...value.after, phoneE164: null }
  } as any);
  await CaptureUpdateContactSourceBridge(
    value.model as any,
    context(),
    "1",
    {},
    value.persist as any,
    value.reload as any
  );
  expect(value.entries).toHaveLength(0);
  expect(value.unit.completeCommand).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ intent: "pending_identity" })
  );
});
it("replay never invokes source mutation", async () => {
  const value = fixture({
    source: "committed",
    contactId: 1,
    intent: "persisted",
    eventId: randomUUID(),
    reason: "semantic_enrichment",
    producerResult: { id: 1, name: "Synthetic Original" }
  } as any);
  expect(
    (
      await CaptureUpdateContactSourceBridge(
        value.model as any,
        context(),
        "1",
        {},
        value.persist as any,
        value.reload as any
      )
    ).updated
  ).toBe(false);
  expect(value.persist).not.toHaveBeenCalled();
  expect(value.reload).toHaveBeenCalledWith(1);
});
it("snapshot identity mismatch rolls back without a journal", async () => {
  const value = fixture();
  value.persist.mockResolvedValue({
    contact: { get: () => ({ id: 2 }) },
    before: value.before,
    after: { ...value.after, id: 2 }
  } as any);
  await expect(
    CaptureUpdateContactSourceBridge(
      value.model as any,
      context(),
      "1",
      {},
      value.persist as any,
      value.reload as any
    )
  ).rejects.toThrow("ORIGIN_CONTACT_IDENTITY_CONFLICT");
  expect(value.unit.insert).not.toHaveBeenCalled();
});
it("oversized original return cannot silently overflow command storage", async () => {
  const value = fixture();
  value.persist.mockResolvedValue({
    contact: { get: () => ({ id: 1, name: "x".repeat(32769) }) },
    before: value.before,
    after: value.after
  } as any);
  await expect(
    CaptureUpdateContactSourceBridge(
      value.model as any,
      context(),
      "1",
      {},
      value.persist as any,
      value.reload as any
    )
  ).rejects.toThrow("SOURCE_UPDATE_RESULT_LIMIT");
  expect(value.unit.insert).not.toHaveBeenCalled();
  expect(value.unit.completeCommand).not.toHaveBeenCalled();
});
