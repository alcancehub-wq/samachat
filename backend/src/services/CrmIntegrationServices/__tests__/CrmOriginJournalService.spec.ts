import { randomUUID } from "crypto";
import CrmOriginJournalService, {
  OriginCaptureRequest,
  OriginJournalEntry,
  OriginJournalHash,
  OriginJournalUnitOfWork,
  VerifyOriginJournalEntry
} from "../CrmOriginJournalService";

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
const fixture = () => {
  const entries: OriginJournalEntry[] = [];
  const unit: OriginJournalUnitOfWork = {
    lockCommand: jest.fn(async () => null),
    mutateContact: jest.fn(async () => ({
      before: null,
      after: {
        id: 1,
        name: "Synthetic Contact",
        number: "12025550101",
        isGroup: false
      }
    })),
    latest: jest.fn(async () => entries[entries.length - 1] || null),
    insert: jest.fn(async entry => {
      entries.push(entry);
    }),
    completeCommand: jest.fn(async () => undefined)
  };
  const repository = { transaction: jest.fn(async work => work(unit)) };
  const service = new CrmOriginJournalService(repository, {
    enabled: true,
    identity
  });
  return { entries, unit, repository, service };
};
it("persists an eligible R09 envelope without sending or commercial admission", async () => {
  const { entries, service } = fixture();
  expect((await service.capture(request())).intent).toBe("persisted");
  const entry = entries[0];
  const envelope = JSON.parse(entry.canonicalBody);
  expect(entry.bodyHash).toBe(OriginJournalHash(entry.canonicalBody));
  expect(envelope).toMatchObject({
    source_contact_id: "1",
    source_revision: 1,
    operation: "upsert_contact",
    schema_version: 1
  });
  expect(entry.state).toBe("intent_persisted");
  expect(entry.attemptCount).toBe(0);
  expect(entry.commercialOperation).toBe("not_requested");
  VerifyOriginJournalEntry(entry);
});
it("persists commercial admission metadata consistently with the envelope", async () => {
  const { entries, service } = fixture();
  const value = request();
  const outcome = await service.capture({
    ...value,
    commercialRequest: {
      enabled: true,
      pipeline_name: "SDR",
      stage_name: "NOVO LEAD",
      owner_email: "agentesdr@samacon.com.br"
    }
  });
  expect(outcome.intent).toBe("persisted");
  expect(entries).toHaveLength(1);
  const entry = entries[0];
  const envelope = JSON.parse(entry.canonicalBody);
  expect(entry.commercialOperation).toBe("ensure_initial_admission");
  expect(envelope.data.commercial_request).toEqual({
    enabled: true,
    pipeline_name: "SDR",
    stage_name: "NOVO LEAD",
    owner_email: "agentesdr@samacon.com.br"
  });
  expect(() => VerifyOriginJournalEntry(entry)).not.toThrow();
});
it("closed by default means no source write or transaction", async () => {
  const { repository } = fixture();
  const service = new CrmOriginJournalService(repository, {
    enabled: false,
    identity
  });
  expect(await service.capture(request())).toEqual({
    source: "not_mutated",
    intent: "disabled"
  });
  expect(repository.transaction).not.toHaveBeenCalled();
});
it.each([
  "history",
  "echo",
  "outbound",
  "reconciliation",
  "ack",
  "unknown"
] as const)("R09 guards %s", async kind => {
  const { service, entries } = fixture();
  const value = request();
  expect(
    (
      await service.capture({
        ...value,
        metadata: { messageProvenance: { kind, provider: "wwebjs" } }
      })
    ).intent
  ).toBe("no_action");
  expect(entries).toHaveLength(0);
});
it("missing metadata cannot become realtime", async () => {
  const { service, entries } = fixture();
  expect(
    (await service.capture({ ...request(), metadata: undefined })).intent
  ).toBe("no_action");
  expect(entries).toHaveLength(0);
});
it("same semantic pending intent reuses immutable event rather than increasing revision", async () => {
  const { service, entries } = fixture();
  const first = await service.capture(request());
  const second = await service.capture(request());
  expect(second.intent).toBe("existing");
  expect((second as any).eventId).toBe((first as any).eventId);
  expect(entries).toHaveLength(1);
});
it("journal error bubbles out of the transactional callback", async () => {
  const { service, unit } = fixture();
  (unit.insert as jest.Mock).mockRejectedValue(
    new Error("synthetic_journal_failure")
  );
  await expect(service.capture(request())).rejects.toThrow(
    "synthetic_journal_failure"
  );
  expect(unit.completeCommand).not.toHaveBeenCalled();
});
it("integrity rejects changed body instead of recreating an event", async () => {
  const { service, entries } = fixture();
  await service.capture(request());
  expect(() =>
    VerifyOriginJournalEntry({
      ...entries[0],
      canonicalBody: entries[0].canonicalBody + " "
    })
  ).toThrow("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
});