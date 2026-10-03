import { randomBytes, randomUUID, createHmac } from "crypto";
import CrmDeliveryCoordinator, {
  DeliveryCoordinatorRepository
} from "../CrmDeliveryCoordinator";
import CrmOriginJournalService, {
  OriginJournalEntry,
  OriginJournalUnitOfWork
} from "../CrmOriginJournalService";
const identity = {
  integrationId: "synthetic-integration",
  organizationId: "00000000-0000-4000-8000-000000000001",
  sourceInstanceId: "synthetic-instance"
};
const fixture = async () => {
  let entry: OriginJournalEntry | null = null;
  const unit: OriginJournalUnitOfWork = {
    lockCommand: async () => null,
    mutateContact: async () => ({
      before: null,
      after: { id: 1, name: "Synthetic", number: "12025550101", isGroup: false }
    }),
    latest: async () => null,
    insert: async value => {
      entry = value;
    },
    completeCommand: async () => undefined
  };
  await new CrmOriginJournalService(
    { transaction: async work => work(unit) },
    { enabled: true, identity }
  ).capture({
    captureKey: randomUUID(),
    correlationId: randomUUID(),
    mutation: {
      kind: "create",
      data: { name: "Synthetic", number: "12025550101", isGroup: false }
    },
    phoneE164: "+12025550101",
    bindingStatus: "not_linked",
    context: {
      channel: "manual",
      provenance: "manual",
      fromMe: false,
      isGroup: false,
      authorized: true
    }
  });
  const original = entry as unknown as OriginJournalEntry;
  const repository: DeliveryCoordinatorRepository = {
    deliveryCandidate: jest.fn(async () => original),
    read: jest.fn(async () => original),
    recoverExpired: jest.fn(async () => 0),
    transition: jest.fn(async (_scope, _id, version, change) => {
      if (version !== original.stateVersion)
        throw new Error("ORIGIN_STATE_VERSION_CONFLICT");
      original.stateVersion++;
      if (change.kind === "begin_attempt") {
        original.attemptCount++;
        original.attemptId = change.attemptId;
        original.state = "attempt_started";
        original.leaseExpiresAt = change.leaseExpiresAt;
      } else if (change.kind === "transport_accepted")
        original.state = "transport_accepted";
      else if (change.kind === "uncertain") {
        original.state = "reconciliation_required";
        original.lastErrorCode = change.code;
      } else if (change.kind === "receipt")
        original.state =
          (change.value as any).contact_result.status === "created"
            ? "contact_confirmed"
            : "receipt_validated";
      else original.state = "terminal_failure";
      return original;
    })
  };
  const secret = randomBytes(32);
  const now = new Date("2026-10-03T12:00:00.000Z");
  const transport = jest.fn(async () => ({
    status: 200,
    body: {
      schema_version: 1,
      event_id: original.eventId,
      organization_id: identity.organizationId,
      correlation_id: original.correlationId,
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
    }
  }));
  const configuration = {
    enabled: true,
    identity,
    m2m: {
      endpoint: "https://synthetic.invalid/m2m",
      approvedEndpoint: "https://synthetic.invalid/m2m",
      keyId: "ephemeral-key",
      secret
    },
    transport
  };
  return { entry: original, repository, transport, configuration, secret, now };
};
it("disabled never reads or sends", async () => {
  const value = await fixture();
  expect(
    await new CrmDeliveryCoordinator(value.repository).runOnce(identity)
  ).toEqual({ state: "disabled" });
  expect(value.repository.deliveryCandidate).not.toHaveBeenCalled();
  expect(value.transport).not.toHaveBeenCalled();
});
it("one initial attempt uses original bytes and existing HMAC client", async () => {
  const value = await fixture();
  const body = value.entry.canonicalBody;
  expect(
    (
      await new CrmDeliveryCoordinator(
        value.repository,
        value.configuration,
        () => value.now
      ).runOnce(identity)
    ).state
  ).toBe("contact_confirmed");
  expect(value.transport).toHaveBeenCalledTimes(1);
  const request = (value.transport as jest.Mock).mock.calls[0][0];
  expect(request.body).toBe(body);
  expect(request.headers["X-SamaChat-Signature"]).toBe(
    createHmac("sha256", value.secret)
      .update(`${value.now.toISOString()}\n${value.entry.eventId}\n${body}`)
      .digest("hex")
  );
});
it("uncertain event queries receipt once rather than re-upserting on404", async () => {
  const value = await fixture();
  value.entry.state = "reconciliation_required";
  value.entry.attemptCount = 1;
  value.transport.mockResolvedValue({ status: 404, body: {} } as any);
  const result = await new CrmDeliveryCoordinator(
    value.repository,
    value.configuration,
    () => value.now
  ).runOnce(identity);
  expect(result).toMatchObject({
    state: "reconciliation_required",
    operation: "get_receipt",
    code: "receipt_not_found_inconclusive"
  });
  expect(
    JSON.parse((value.transport as jest.Mock).mock.calls[0][0].body)
  ).toMatchObject({ operation: "get_receipt", event_id: value.entry.eventId });
  expect(value.transport).toHaveBeenCalledTimes(1);
});
it("scope and bad config reject before repository/send", async () => {
  const value = await fixture();
  expect(
    (
      await new CrmDeliveryCoordinator(
        value.repository,
        value.configuration
      ).runOnce({ ...identity, organizationId: randomUUID() })
    ).state
  ).toBe("rejected");
  expect(value.repository.deliveryCandidate).not.toHaveBeenCalled();
  expect(value.transport).not.toHaveBeenCalled();
  expect(
    (
      await new CrmDeliveryCoordinator(value.repository, {
        ...value.configuration,
        transport: undefined
      }).runOnce(identity)
    ).state
  ).toBe("rejected");
});
it("corruption rejects before acquisition or transport", async () => {
  const value = await fixture();
  Object.assign(value.entry, {
    canonicalBody: value.entry.canonicalBody + " "
  });
  expect(
    (
      await new CrmDeliveryCoordinator(
        value.repository,
        value.configuration
      ).runOnce(identity)
    ).state
  ).toBe("rejected");
  expect(value.repository.transition).not.toHaveBeenCalled();
  expect(value.transport).not.toHaveBeenCalled();
});
