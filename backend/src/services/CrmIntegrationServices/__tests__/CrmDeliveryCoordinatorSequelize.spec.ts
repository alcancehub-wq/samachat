import "reflect-metadata";
import { createHmac, randomBytes, randomUUID } from "crypto";
import { Sequelize } from "sequelize-typescript";
import { QueryTypes } from "sequelize";
import {
  ContactFixture,
  InitializeContactSourceBridgeLab
} from "./fixtures/ContactSourceBridgeLab";
import CrmOriginJournal from "../../../models/CrmOriginJournal";
import CrmOriginJournalService, {
  OriginCaptureOutcome,
  OriginJournalEntry,
  OriginJournalHash
} from "../CrmOriginJournalService";
import SequelizeCrmOriginJournalRepository from "../SequelizeCrmOriginJournalRepository";
import CrmDeliveryCoordinator, {
  DeliveryCoordinatorConfiguration
} from "../CrmDeliveryCoordinator";
import { CrmM2mAttempt } from "../CrmM2mClient";
import { CrmContactSnapshot } from "../BuildCrmContactIntentService";
const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const laboratory =
  process.env.CRM_DELIVERY_COORDINATOR_LAB_ENABLED === "1"
    ? describe
    : describe.skip;
laboratory("R13 coordinator with durable SQL CAS/order/readback", () => {
  let database: Sequelize;
  let repository: SequelizeCrmOriginJournalRepository;
  let now: Date;
  let httpsRequest: jest.SpyInstance;
  let httpRequest: jest.SpyInstance;
  const secret = randomBytes(32);
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
    database = await InitializeContactSourceBridgeLab();
    repository = new SequelizeCrmOriginJournalRepository(
      database,
      ContactFixture
    );
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
    now = new Date("2026-10-03T13:00:00.000Z");
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
  const seed = async (number = "12025550101") => {
    const result = (await new CrmOriginJournalService(
      repository,
      { enabled: true, identity },
      () => now
    ).capture({
      captureKey: randomUUID(),
      correlationId: randomUUID(),
      phoneE164: `+${number}`,
      bindingStatus: "not_linked",
      context: {
        channel: "manual",
        provenance: "manual",
        authorized: true,
        fromMe: false,
        isGroup: false
      },
      mutation: {
        kind: "create",
        data: { name: "Synthetic Contact", number, isGroup: false }
      }
    })) as OriginCaptureOutcome;
    return (await repository.read(identity, result.eventId!))!;
  };
  const revise = async (entry: OriginJournalEntry) => {
    const source = {
      transaction: <Result>(work: any): Promise<Result> =>
        repository.transaction(work, async (_mutation, transaction) => {
          const row = (await ContactFixture.findByPk(
            Number(entry.sourceContactId),
            { transaction, lock: transaction.LOCK.UPDATE }
          ))!;
          const before = { ...row.get({ plain: true }) } as CrmContactSnapshot;
          await row.update({ name: "Synthetic Revision2" }, { transaction });
          return {
            before,
            after: { ...row.get({ plain: true }) } as CrmContactSnapshot
          };
        })
    };
    const result = (await new CrmOriginJournalService(
      source,
      { enabled: true, identity },
      () => now
    ).capture({
      captureKey: randomUUID(),
      correlationId: randomUUID(),
      phoneE164: JSON.parse(entry.canonicalBody).data.phone_e164,
      bindingStatus: "linked",
      context: {
        channel: "manual",
        provenance: "manual",
        authorized: true,
        fromMe: false,
        isGroup: false
      },
      mutation: {
        kind: "update",
        contactId: Number(entry.sourceContactId),
        data: { name: "Synthetic Revision2" }
      }
    })) as OriginCaptureOutcome;
    return (await repository.read(identity, result.eventId!))!;
  };
  const receipt = (entry: OriginJournalEntry, status = "created") => ({
    schema_version: 1,
    event_id: entry.eventId,
    organization_id: identity.organizationId,
    correlation_id: entry.correlationId,
    receipt_id: randomUUID(),
    processing_state: status === "not_persisted" ? "accepted" : "processed",
    contact_result: {
      status,
      crm_contact_id: status === "not_persisted" ? null : randomUUID(),
      persisted_at: status === "not_persisted" ? null : now.toISOString()
    },
    commercial_result: {
      status: "not_requested",
      primary_deal_id: null,
      opportunity_id: null
    },
    error: null
  });
  const coordinator = (
    transport: NonNullable<CrmM2mAttempt["transport"]>,
    policy?: DeliveryCoordinatorConfiguration["policy"],
    store = repository
  ) =>
    new CrmDeliveryCoordinator(
      store,
      {
        enabled: true,
        identity,
        m2m: {
          endpoint: "https://synthetic.invalid/m2m",
          approvedEndpoint: "https://synthetic.invalid/m2m",
          keyId: "ephemeral-key",
          secret
        },
        transport,
        policy
      },
      () => now
    );
  const afterBackoff = () => {
    now = new Date(+now + 61000);
  };
  it("disabled has zero acquisition/transport", async () => {
    await seed();
    const transport = jest.fn(async () => ({ status: 200, body: {} }));
    expect(
      await new CrmDeliveryCoordinator(repository).runOnce(identity)
    ).toEqual({ state: "disabled" });
    expect(transport).not.toHaveBeenCalled();
    expect((await CrmOriginJournal.findOne())!.attemptCount).toBe(0);
  });
  it("two coordinators cannot acquire/send the same event twice", async () => {
    const entry = await seed();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const ready = new Promise<void>(resolve => {
      started = resolve;
    });
    const transport = jest.fn(async () => {
      started();
      await gate;
      return { status: 200, body: receipt(entry) };
    });
    const first = coordinator(transport).runOnce(identity);
    await ready;
    const second = await coordinator(transport).runOnce(identity);
    expect(["idle", "busy"]).toContain(second.state);
    release();
    expect((await first).state).toBe("contact_confirmed");
    expect(transport).toHaveBeenCalledTimes(1);
    expect((await repository.read(identity, entry.eventId))!.attemptCount).toBe(
      1
    );
  });
  it("independent contact can run while another lease/network operation is active", async () => {
    await seed();
    await seed("12025550102");
    const firstEntry = (await repository.deliveryCandidate(identity, now, 5))!;
    let release!: () => void;
    let signal!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const ready = new Promise<void>(resolve => {
      signal = resolve;
    });
    const transport = jest.fn(async wire => {
      const body = JSON.parse(wire.body);
      const entry = (await repository.read(identity, body.event_id))!;
      if (entry.eventId === firstEntry.eventId) {
        signal();
        await gate;
      }
      return { status: 200, body: receipt(entry) };
    });
    const first = coordinator(transport).runOnce(identity);
    try {
      await Promise.race([
        ready,
        first.then(result => {
          throw new Error(`unexpected_first_completion_${result.state}`);
        })
      ]);
      const second = await coordinator(transport).runOnce(identity);
      expect(second.state).toBe("contact_confirmed");
      expect(second.eventId).not.toBe(firstEntry.eventId);
    } finally {
      release();
      await first;
    }
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("successive revisions wait for earlier confirmed contact and send in order", async () => {
    const first = await seed();
    const second = await revise(first);
    const calls: string[] = [];
    const transport = jest.fn(async wire => {
      const entry = (await repository.read(
        identity,
        JSON.parse(wire.body).event_id
      ))!;
      calls.push(entry.eventId);
      return { status: 200, body: receipt(entry) };
    });
    expect((await coordinator(transport).runOnce(identity)).eventId).toBe(
      first.eventId
    );
    expect((await coordinator(transport).runOnce(identity)).eventId).toBe(
      second.eventId
    );
    expect(calls).toEqual([first.eventId, second.eventId]);
  });
  it("inconclusive earlier revision blocks newer but not unrelated contacts", async () => {
    const first = await seed();
    const later = await revise(first);
    const independent = await seed("12025550102");
    const attemptId = randomUUID();
    await repository.transition(
      identity,
      first.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId,
        leaseExpiresAt: new Date(+now + 30000).toISOString()
      },
      now
    );
    await repository.transition(
      identity,
      first.eventId,
      1,
      {
        kind: "uncertain",
        attemptId,
        code: "synthetic_timeout",
        notBefore: new Date(+now + 60000).toISOString()
      },
      now
    );
    const next = await repository.deliveryCandidate(identity, now, 5);
    expect(next!.eventId).toBe(independent.eventId);
    await expect(
      repository.transition(
        identity,
        later.eventId,
        0,
        {
          kind: "begin_attempt",
          attemptId: randomUUID(),
          leaseExpiresAt: new Date(+now + 30000).toISOString()
        },
        now
      )
    ).rejects.toThrow("ORIGIN_EVENT_ORDER_BLOCKED");
  });
  it("immutable bytes/hash/revision survive send and HMAC uses exact body", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => ({
      status: 200,
      body: receipt(entry)
    }));
    await coordinator(transport).runOnce(identity);
    const wire = (transport as jest.Mock).mock.calls[0][0] as Parameters<
      NonNullable<CrmM2mAttempt["transport"]>
    >[0];
    expect(wire.body).toBe(entry.canonicalBody);
    expect(wire.headers["X-SamaChat-Signature"]).toBe(
      createHmac("sha256", secret)
        .update(
          `${now.toISOString()}\n${entry.eventId}\n${entry.canonicalBody}`
        )
        .digest("hex")
    );
    const saved = (await repository.read(identity, entry.eventId))!;
    expect(saved.bodyHash).toBe(entry.bodyHash);
    expect(saved.canonicalBody).toBe(entry.canonicalBody);
    expect(saved.sourceRevision).toBe(entry.sourceRevision);
  });
  it.each(["created", "reused", "enriched"])(
    "valid %s confirms only cadastral component",
    async status => {
      const entry = await seed();
      expect(
        (
          await coordinator(async () => ({
            status: 200,
            body: receipt(entry, status)
          })).runOnce(identity)
        ).state
      ).toBe("contact_confirmed");
      const stored = (await repository.read(identity, entry.eventId))!;
      expect(stored.commercialOperation).toBe("not_requested");
      expect(stored.receipt!.commercial_result.opportunity_id).toBeNull();
    }
  );
  it("accepted receipt persists cooldown and next operation is readback", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => ({
      status: 202,
      body: receipt(entry, "not_persisted")
    }));
    expect((await coordinator(transport).runOnce(identity)).state).toBe(
      "receipt_validated"
    );
    expect((await coordinator(transport).runOnce(identity)).state).toBe("idle");
    afterBackoff();
    transport.mockResolvedValue({ status: 200, body: receipt(entry) });
    expect((await coordinator(transport).runOnce(identity)).operation).toBe(
      "get_receipt"
    );
    expect(
      (await repository.read(identity, entry.eventId))!.contactConfirmedAt
    ).not.toBeNull();
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("remote simulated commit plus lost response recovers original receipt on repository restart", async () => {
    const entry = await seed();
    const remote = receipt(entry);
    let first = true;
    const transport = jest.fn(async wire => {
      if (first) {
        first = false;
        throw new Error("synthetic_response_lost_after_remote_commit");
      }
      expect(JSON.parse(wire.body).operation).toBe("get_receipt");
      return { status: 200, body: remote };
    });
    expect((await coordinator(transport).runOnce(identity)).state).toBe(
      "reconciliation_required"
    );
    afterBackoff();
    const restored = new SequelizeCrmOriginJournalRepository(
      database,
      ContactFixture
    );
    const result = await coordinator(transport, undefined, restored).runOnce(
      identity
    );
    expect(result.state).toBe("contact_confirmed");
    expect(result.eventId).toBe(entry.eventId);
    expect(
      (await restored.read(identity, entry.eventId))!.receipt!.receipt_id
    ).toBe(remote.receipt_id);
  });
  it("receipt query404 stays inconclusive and never triggers another upsert", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => ({ status: 503, body: {} }));
    await coordinator(transport).runOnce(identity);
    afterBackoff();
    transport.mockResolvedValue({ status: 404, body: {} });
    const result = await coordinator(transport).runOnce(identity);
    expect(result).toMatchObject({
      state: "reconciliation_required",
      operation: "get_receipt",
      code: "receipt_not_found_inconclusive"
    });
    expect(transport).toHaveBeenCalledTimes(2);
    expect((await repository.read(identity, entry.eventId))!.state).toBe(
      "reconciliation_required"
    );
    expect(
      JSON.parse((transport as jest.Mock).mock.calls[1][0].body).operation
    ).toBe("get_receipt");
  });
  it.each(["organization_id", "event_id", "correlation_id"])(
    "divergent receipt %s never confirms",
    async field => {
      const entry = await seed();
      expect(
        (
          await coordinator(async () => ({
            status: 200,
            body: { ...receipt(entry), [field]: randomUUID() }
          })).runOnce(identity)
        ).state
      ).toBe("reconciliation_required");
      expect(
        (await repository.read(identity, entry.eventId))!.contactConfirmedAt
      ).toBeNull();
    }
  );
  it("lease expiry recovery sends readback once and rejects stale CAS/owner", async () => {
    const entry = await seed();
    const oldAttempt = randomUUID();
    await repository.transition(
      identity,
      entry.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId: oldAttempt,
        leaseExpiresAt: new Date(+now + 15000).toISOString()
      },
      now
    );
    now = new Date(+now + 16000);
    const transport = jest.fn(async () => ({
      status: 200,
      body: receipt(entry)
    }));
    expect((await coordinator(transport).runOnce(identity)).operation).toBe(
      "get_receipt"
    );
    expect(transport).toHaveBeenCalledTimes(1);
    await expect(
      repository.transition(
        identity,
        entry.eventId,
        0,
        { kind: "uncertain", attemptId: oldAttempt, code: "late_timeout" },
        now
      )
    ).rejects.toThrow("ORIGIN_STATE_VERSION_CONFLICT");
  });
  it.each([401, 403, 404, 409, 429, 500, 503])(
    "upsert HTTP%s classified with no retry storm",
    async status => {
      const entry = await seed();
      const transport = jest.fn(async () => ({ status, body: {} }));
      const result = await coordinator(transport).runOnce(identity);
      expect(result.state).toBe(
        [401, 403, 404].includes(status)
          ? "terminal_failure"
          : "reconciliation_required"
      );
      expect((await coordinator(transport).runOnce(identity)).state).toBe(
        "idle"
      );
      expect(transport).toHaveBeenCalledTimes(1);
      expect((await repository.read(identity, entry.eventId))!.eventId).toBe(
        entry.eventId
      );
    }
  );
  it("readback auth error preserves unknown remote component rather than failing source", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => ({ status: 500, body: {} }));
    await coordinator(transport).runOnce(identity);
    afterBackoff();
    transport.mockResolvedValue({ status: 401, body: {} });
    expect((await coordinator(transport).runOnce(identity)).state).toBe(
      "reconciliation_required"
    );
    expect((await repository.read(identity, entry.eventId))!.state).toBe(
      "reconciliation_required"
    );
  });
  it("late accepted receipt cannot regress confirmed contact or overwrite original receipt", async () => {
    const entry = await seed();
    await coordinator(async () => ({
      status: 200,
      body: receipt(entry)
    })).runOnce(identity);
    const confirmed = (await repository.read(identity, entry.eventId))!;
    const late = await repository.transition(
      identity,
      entry.eventId,
      0,
      { kind: "receipt", value: receipt(entry, "not_persisted") },
      now
    );
    expect(late).toEqual(confirmed);
    expect(late.state).toBe("contact_confirmed");
  });
  it("late confirmation with different CRM contact cannot overwrite confirmed component", async () => {
    const entry = await seed();
    await coordinator(async () => ({
      status: 200,
      body: receipt(entry)
    })).runOnce(identity);
    const saved = (await repository.read(identity, entry.eventId))!;
    await expect(
      repository.transition(
        identity,
        entry.eventId,
        0,
        { kind: "receipt", value: receipt(entry) },
        now
      )
    ).rejects.toThrow("ORIGIN_CONFIRMED_RECEIPT_CONFLICT");
    expect(await repository.read(identity, entry.eventId)).toEqual(saved);
  });
  it("expired old owner cannot write response after a new readback claim", async () => {
    const entry = await seed();
    const old = randomUUID();
    await repository.transition(
      identity,
      entry.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId: old,
        leaseExpiresAt: new Date(+now + 15000).toISOString()
      },
      now
    );
    now = new Date(+now + 16000);
    await repository.recoverExpired(identity, now, entry.eventId);
    const recovered = (await repository.read(identity, entry.eventId))!;
    const fresh = await repository.transition(
      identity,
      entry.eventId,
      recovered.stateVersion,
      {
        kind: "begin_attempt",
        attemptId: randomUUID(),
        leaseExpiresAt: new Date(+now + 30000).toISOString()
      },
      now
    );
    await expect(
      repository.transition(
        identity,
        entry.eventId,
        fresh.stateVersion,
        { kind: "receipt", value: receipt(entry), attemptId: old },
        now
      )
    ).rejects.toThrow("ORIGIN_ATTEMPT_ID_CONFLICT");
    expect((await repository.read(identity, entry.eventId))!.attemptId).toBe(
      fresh.attemptId
    );
  });
  it("corrupted event rejects before transport despite readable pending row", async () => {
    const entry = await seed();
    const store = Object.create(repository);
    store.deliveryCandidate = async () => ({
      ...entry,
      canonicalBody: entry.canonicalBody + " "
    });
    const transport = jest.fn(async () => ({ status: 200, body: {} }));
    expect(
      (await coordinator(transport, undefined, store).runOnce(identity)).state
    ).toBe("rejected");
    expect(transport).not.toHaveBeenCalled();
  });
  it("scope divergent event and unexpected commercial receipt rejected", async () => {
    const entry = await seed();
    const store = Object.create(repository);
    store.deliveryCandidate = async () => ({
      ...entry,
      organizationId: randomUUID()
    });
    const transport = jest.fn(async () => ({ status: 200, body: {} }));
    expect(
      (await coordinator(transport, undefined, store).runOnce(identity)).state
    ).toBe("rejected");
    expect(transport).not.toHaveBeenCalled();
    const body = {
      ...receipt(entry),
      commercial_result: {
        status: "created",
        primary_deal_id: randomUUID(),
        opportunity_id: randomUUID()
      }
    };
    expect(
      (await coordinator(async () => ({ status: 200, body })).runOnce(identity))
        .state
    ).toBe("reconciliation_required");
    expect(
      (await repository.read(identity, entry.eventId))!.commercialOperation
    ).toBe("not_requested");
  });
  it("valid hash on an unsupported envelope is still rejected before claim/send", async () => {
    const entry = await seed();
    const canonicalBody = JSON.stringify({
      ...JSON.parse(entry.canonicalBody),
      source_system: "unsupported-source"
    });
    const store = Object.create(repository);
    store.deliveryCandidate = async () => ({
      ...entry,
      canonicalBody,
      bodyHash: OriginJournalHash(canonicalBody)
    });
    const transport = jest.fn(async () => ({ status: 200, body: {} }));
    expect(
      (await coordinator(transport, undefined, store).runOnce(identity)).state
    ).toBe("rejected");
    expect(transport).not.toHaveBeenCalled();
    expect((await repository.read(identity, entry.eventId))!.attemptCount).toBe(
      0
    );
  });
  it("actual corrupted head is isolated for review without starving unrelated contacts", async () => {
    const invalid = await seed();
    const healthy = await seed("12025550102");
    await repository.transition(
      identity,
      invalid.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId: randomUUID(),
        leaseExpiresAt: new Date(+now + 15000).toISOString()
      },
      now
    );
    now = new Date(+now + 16000);
    const definitions = await database.query(
      "SHOW CREATE TRIGGER crm_origin_journal_immutable",
      { type: QueryTypes.SELECT }
    );
    const definition = (definitions[0] as Record<string, string>)[
      "SQL Original Statement"
    ];
    await database.query("DROP TRIGGER crm_origin_journal_immutable");
    try {
      await database.query(
        "UPDATE CrmOriginJournals SET canonicalBody=:body,createdAt='2026-01-01 00:00:00' WHERE eventId=:eventId",
        {
          replacements: {
            body: invalid.canonicalBody + " ",
            eventId: invalid.eventId
          }
        }
      );
    } finally {
      await database.query(definition);
    }
    const transport = jest.fn(async () => ({
      status: 200,
      body: receipt(healthy)
    }));
    const runner = coordinator(transport);
    expect((await runner.runOnce(identity)).state).toBe("rejected");
    expect(transport).not.toHaveBeenCalled();
    const raw = (await CrmOriginJournal.findByPk(invalid.eventId))!;
    expect(raw.state).toBe("reconciliation_required");
    expect(raw.lastErrorCode).toBe("journal_integrity_requires_review");
    expect((await runner.runOnce(identity)).eventId).toBe(healthy.eventId);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(raw.canonicalBody).toBe(invalid.canonicalBody + " ");
  });
  it("execution budget bounds readback without changing body or revision", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => ({ status: 503, body: {} }));
    await coordinator(transport, { maxOperations: 2 }).runOnce(identity);
    afterBackoff();
    await coordinator(transport, { maxOperations: 2 }).runOnce(identity);
    afterBackoff();
    expect(
      (await coordinator(transport, { maxOperations: 2 }).runOnce(identity))
        .state
    ).toBe("idle");
    expect(transport).toHaveBeenCalledTimes(2);
    expect(
      (await repository.read(identity, entry.eventId))!.canonicalBody
    ).toBe(entry.canonicalBody);
  });
  it("expired final lease recovers durable uncertainty without exceeding budget", async () => {
    const entry = await seed();
    await repository.transition(
      identity,
      entry.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId: randomUUID(),
        leaseExpiresAt: new Date(+now + 15000).toISOString()
      },
      now
    );
    now = new Date(+now + 16000);
    const transport = jest.fn(async () => ({ status: 200, body: {} }));
    expect(
      await coordinator(transport, { maxOperations: 1 }).runOnce(identity)
    ).toMatchObject({
      state: "reconciliation_required",
      code: "execution_budget_exhausted"
    });
    expect((await repository.read(identity, entry.eventId))!.state).toBe(
      "reconciliation_required"
    );
    expect(transport).not.toHaveBeenCalled();
  });
  it("state persistence failure after HTTP preserves lease and reports reconciliation", async () => {
    const entry = await seed();
    const store = Object.create(repository);
    store.transition = async (
      scope: any,
      id: string,
      version: number,
      change: any,
      date: Date
    ) => {
      if (change.kind !== "begin_attempt")
        throw new Error("synthetic_database_failure_after_HTTP");
      return repository.transition(scope, id, version, change, date);
    };
    const transport = jest.fn(async () => ({
      status: 200,
      body: receipt(entry)
    }));
    expect(
      await coordinator(transport, undefined, store).runOnce(identity)
    ).toMatchObject({
      state: "reconciliation_required",
      code: "state_write_uncertain"
    });
    expect((await repository.read(identity, entry.eventId))!.state).toBe(
      "attempt_started"
    );
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("no SQL transaction is held during injected network wait", async () => {
    const entry = await seed();
    const transport = jest.fn(async () => {
      const reader = await require("mysql2/promise").createConnection({
        host: "127.0.0.1",
        port: 55444,
        user: "root",
        password: "",
        database: "r13_delivery_lab"
      });
      try {
        await reader.query("SET innodb_lock_wait_timeout=1");
        await reader.query("START TRANSACTION");
        await reader.query(
          "SELECT eventId FROM CrmOriginJournals WHERE eventId=? FOR UPDATE",
          [entry.eventId]
        );
        await reader.query("ROLLBACK");
      } finally {
        await reader.end();
      }
      return { status: 200, body: receipt(entry) };
    });
    expect((await coordinator(transport).runOnce(identity)).state).toBe(
      "contact_confirmed"
    );
  });
  it("legacy read pending recovery and transitions without new optional fields remain compatible", async () => {
    const entry = await seed();
    expect((await repository.pending(identity))[0].eventId).toBe(entry.eventId);
    const attemptId = randomUUID();
    let value = await repository.transition(
      identity,
      entry.eventId,
      0,
      {
        kind: "begin_attempt",
        attemptId,
        leaseExpiresAt: new Date(+now + 15000).toISOString()
      },
      now
    );
    value = await repository.transition(
      identity,
      entry.eventId,
      value.stateVersion,
      { kind: "uncertain", attemptId, code: "legacy_uncertain" },
      now
    );
    expect(value.leaseExpiresAt).toBeNull();
    value = await repository.transition(
      identity,
      entry.eventId,
      value.stateVersion,
      { kind: "receipt", value: receipt(entry) },
      now
    );
    expect(value.state).toBe("contact_confirmed");
    expect(await repository.recoverExpired(identity, now)).toBe(0);
    expect(await repository.pending(identity)).toHaveLength(0);
  });
});
