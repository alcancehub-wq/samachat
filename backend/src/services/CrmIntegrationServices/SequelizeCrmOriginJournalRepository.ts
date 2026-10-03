import {
  Model,
  ModelCtor,
  Op,
  QueryTypes,
  Sequelize,
  Transaction
} from "sequelize";
import CrmOriginCaptureCommand from "../../models/CrmOriginCaptureCommand";
import CrmOriginJournal from "../../models/CrmOriginJournal";
import { CrmM2mIdentity } from "./CrmM2mClient";
import { CrmContactSnapshot } from "./BuildCrmContactIntentService";
import {
  OriginCaptureOutcome,
  OriginCaptureRequest,
  OriginContactMutation,
  OriginJournalEntry,
  OriginJournalRepository,
  OriginJournalUnitOfWork,
  ValidateOriginJournalIdentity,
  ValidateOriginJournalReceipt,
  VerifyOriginJournalEntry
} from "./CrmOriginJournalService";

const fields = [
  "name",
  "number",
  "lid",
  "isGroup",
  "email",
  "profilePicUrl",
  "city",
  "state",
  "captureChannel",
  "wasReferred",
  "referralType",
  "referralContactId",
  "referralContactName",
  "referralUserId",
  "referralPartnerName"
];
const processing = [
  "state",
  "stateVersion",
  "attemptCount",
  "attemptId",
  "leaseExpiresAt",
  "transportAcceptedAt",
  "receiptValidatedAt",
  "contactConfirmedAt",
  "receipt",
  "lastErrorCode"
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const snapshot = (row: Model): CrmContactSnapshot =>
  row.get({ plain: true }) as CrmContactSnapshot;
const decode = (row: CrmOriginJournal): OriginJournalEntry => {
  const data = row.get({ plain: true }) as Record<string, unknown>;
  const entry = {
    ...data,
    sourceRevision: Number(data.sourceRevision),
    receipt: typeof data.receipt === "string" ? JSON.parse(data.receipt) : null
  } as unknown as OriginJournalEntry;
  VerifyOriginJournalEntry(entry);
  return entry;
};
export type OriginJournalTransition =
  | { kind: "begin_attempt"; attemptId: string; leaseExpiresAt: string }
  | { kind: "transport_accepted"; attemptId: string }
  | { kind: "uncertain"; attemptId: string; code: string }
  | { kind: "terminal_failure"; code: string }
  | { kind: "receipt"; value: unknown };

export default class SequelizeCrmOriginJournalRepository
  implements OriginJournalRepository
{
  constructor(
    private readonly database: Sequelize,
    private readonly contactModel: ModelCtor<Model>
  ) {
    if (
      database.getDialect() !== "mysql" ||
      contactModel.sequelize !== database ||
      CrmOriginJournal.sequelize !== database ||
      CrmOriginCaptureCommand.sequelize !== database
    )
      throw new Error("ORIGIN_REPOSITORY_TRANSACTION_BINDING_INVALID");
  }

  async transaction<Result>(
    work: (unit: OriginJournalUnitOfWork) => Promise<Result>,
    sourceMutation?: (
      mutation: OriginContactMutation,
      transaction: Transaction
    ) => Promise<{
      before: CrmContactSnapshot | null;
      after: CrmContactSnapshot;
    }>
  ): Promise<Result> {
    return this.database.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
      async transaction => {
        const unit: OriginJournalUnitOfWork = {
          lockCommand: (request, identity, inputHash) =>
            this.lockCommand(request, identity, inputHash, transaction),
          mutateContact: mutation =>
            sourceMutation
              ? sourceMutation(mutation, transaction)
              : this.mutateContact(mutation, transaction),
          latest: async (sourceInstanceId, sourceContactId) => {
            const row = await CrmOriginJournal.findOne({
              where: { sourceInstanceId, sourceContactId },
              order: [["sourceRevision", "DESC"]],
              transaction,
              lock: transaction.LOCK.UPDATE
            });
            return row ? decode(row) : null;
          },
          insert: async entry => {
            VerifyOriginJournalEntry(entry);
            await CrmOriginJournal.create(
              { ...entry, receipt: null },
              { transaction }
            );
          },
          completeCommand: async (captureKey, outcome) => {
            const [updated] = await CrmOriginCaptureCommand.update(
              { outcome: JSON.stringify(outcome) },
              { where: { captureKey, outcome: null }, transaction }
            );
            if (updated !== 1)
              throw new Error("ORIGIN_CAPTURE_COMPLETION_CONFLICT");
          }
        };
        return work(unit);
      }
    );
  }

  private async lockCommand(
    request: OriginCaptureRequest,
    identity: CrmM2mIdentity,
    inputHash: string,
    transaction: Transaction
  ): Promise<OriginCaptureOutcome | null> {
    await this.database.query(
      `INSERT INTO CrmOriginCaptureCommands
      (captureKey,sourceInstanceId,integrationId,organizationId,inputHash,outcome,createdAt,updatedAt)
      VALUES (:captureKey,:sourceInstanceId,:integrationId,:organizationId,:inputHash,NULL,NOW(),NOW())
      ON DUPLICATE KEY UPDATE captureKey=captureKey`,
      {
        transaction,
        type: QueryTypes.INSERT,
        replacements: {
          captureKey: request.captureKey,
          sourceInstanceId: identity.sourceInstanceId,
          integrationId: identity.integrationId,
          organizationId: identity.organizationId,
          inputHash
        }
      }
    );
    const command = await CrmOriginCaptureCommand.findByPk(request.captureKey, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (
      !command ||
      command.inputHash !== inputHash ||
      command.sourceInstanceId !== identity.sourceInstanceId ||
      command.integrationId !== identity.integrationId ||
      command.organizationId !== identity.organizationId
    )
      throw new Error("ORIGIN_CAPTURE_KEY_CONFLICT");
    return command.outcome
      ? (JSON.parse(command.outcome) as OriginCaptureOutcome)
      : null;
  }

  private async mutateContact(
    mutation: OriginContactMutation,
    transaction: Transaction
  ) {
    const options = { transaction, hooks: false };
    if (
      !mutation.data ||
      Object.keys(mutation.data).some(key => !fields.includes(key))
    )
      throw new Error("ORIGIN_MUTATION_FIELD_NOT_AUTHORIZED");
    if (mutation.kind === "create") {
      const contact = await this.contactModel.create(mutation.data, options);
      return { before: null, after: snapshot(contact) };
    }
    if (!Number.isSafeInteger(mutation.contactId) || mutation.contactId <= 0)
      throw new Error("ORIGIN_CONTACT_IDENTITY_CONFLICT");
    const contact = await this.contactModel.findByPk(mutation.contactId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!contact) throw new Error("ORIGIN_CONTACT_NOT_FOUND");
    const before = snapshot(contact);
    await contact.update(mutation.data, options);
    return { before, after: snapshot(contact) };
  }

  private scope(identity: CrmM2mIdentity) {
    ValidateOriginJournalIdentity(identity);
    return {
      sourceInstanceId: identity.sourceInstanceId,
      integrationId: identity.integrationId,
      organizationId: identity.organizationId
    };
  }
  async read(
    identity: CrmM2mIdentity,
    eventId: string
  ): Promise<OriginJournalEntry | null> {
    const row = await CrmOriginJournal.findOne({
      where: { ...this.scope(identity), eventId }
    });
    return row ? decode(row) : null;
  }
  async pending(
    identity: CrmM2mIdentity,
    limit = 50
  ): Promise<OriginJournalEntry[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      throw new Error("ORIGIN_READ_LIMIT_INVALID");
    const rows = await CrmOriginJournal.findAll({
      where: {
        ...this.scope(identity),
        state: {
          [Op.in]: [
            "intent_persisted",
            "receipt_validated",
            "reconciliation_required"
          ]
        }
      },
      limit,
      order: [
        ["createdAt", "ASC"],
        ["eventId", "ASC"]
      ]
    });
    return rows.map(decode);
  }
  async transition(
    identity: CrmM2mIdentity,
    eventId: string,
    expectedVersion: number,
    change: OriginJournalTransition,
    now: Date
  ): Promise<OriginJournalEntry> {
    return this.database.transaction(async transaction => {
      const row = await CrmOriginJournal.findOne({
        where: { ...this.scope(identity), eventId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!row) throw new Error("ORIGIN_JOURNAL_NOT_FOUND");
      const entry = decode(row);
      if (entry.stateVersion !== expectedVersion)
        throw new Error("ORIGIN_STATE_VERSION_CONFLICT");
      const timestamp = now.toISOString();
      if (
        entry.state === "contact_confirmed" ||
        entry.state === "terminal_failure"
      )
        throw new Error("ORIGIN_STATE_TERMINAL");
      if (change.kind === "begin_attempt") {
        if (
          ![
            "intent_persisted",
            "receipt_validated",
            "reconciliation_required"
          ].includes(entry.state) ||
          !uuid.test(change.attemptId) ||
          !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(change.leaseExpiresAt) ||
          !Number.isFinite(Date.parse(change.leaseExpiresAt)) ||
          Date.parse(change.leaseExpiresAt) <= now.getTime() ||
          Date.parse(change.leaseExpiresAt) > now.getTime() + 300000
        )
          throw new Error("ORIGIN_ATTEMPT_INVALID");
        entry.state = "attempt_started";
        entry.attemptId = change.attemptId;
        entry.attemptCount++;
        entry.leaseExpiresAt = change.leaseExpiresAt;
      } else if (change.kind === "receipt") {
        const receipt = ValidateOriginJournalReceipt(change.value, entry);
        entry.receipt = receipt;
        entry.receiptValidatedAt = entry.receiptValidatedAt || timestamp;
        const confirmed = ["created", "reused", "enriched"].includes(
          receipt.contact_result.status
        );
        entry.state = confirmed
          ? "contact_confirmed"
          : receipt.processing_state === "accepted"
          ? "receipt_validated"
          : "reconciliation_required";
        if (confirmed)
          entry.contactConfirmedAt = entry.contactConfirmedAt || timestamp;
        entry.leaseExpiresAt = null;
        entry.lastErrorCode = receipt.error?.code || null;
      } else if (change.kind === "terminal_failure") {
        if (!/^[a-z][a-z0-9_]{0,99}$/.test(change.code))
          throw new Error("ORIGIN_ERROR_CODE_INVALID");
        entry.state = "terminal_failure";
        entry.lastErrorCode = change.code;
        entry.leaseExpiresAt = null;
      } else {
        if (
          entry.attemptId !== change.attemptId ||
          !["attempt_started", "transport_accepted"].includes(entry.state)
        )
          throw new Error("ORIGIN_ATTEMPT_ID_CONFLICT");
        if (change.kind === "transport_accepted") {
          entry.state = "transport_accepted";
          entry.transportAcceptedAt = entry.transportAcceptedAt || timestamp;
        } else {
          if (!/^[a-z][a-z0-9_]{0,99}$/.test(change.code))
            throw new Error("ORIGIN_ERROR_CODE_INVALID");
          entry.state = "reconciliation_required";
          entry.lastErrorCode = change.code;
          entry.leaseExpiresAt = null;
        }
      }
      entry.stateVersion++;
      const updates = Object.fromEntries(
        processing.map(field => [
          field,
          field === "receipt"
            ? entry.receipt
              ? JSON.stringify(entry.receipt)
              : null
            : entry[field as keyof OriginJournalEntry]
        ])
      );
      await row.update(updates, { transaction, fields: processing });
      return decode(row);
    });
  }
  async recoverExpired(identity: CrmM2mIdentity, now: Date): Promise<number> {
    const [count] = await CrmOriginJournal.update(
      {
        state: "reconciliation_required",
        leaseExpiresAt: null,
        lastErrorCode: "attempt_lease_expired",
        stateVersion: Sequelize.literal("stateVersion + 1") as unknown as number
      },
      {
        where: {
          ...this.scope(identity),
          state: { [Op.in]: ["attempt_started", "transport_accepted"] },
          leaseExpiresAt: { [Op.lte]: now.toISOString() }
        },
        fields: ["state", "leaseExpiresAt", "lastErrorCode", "stateVersion"]
      }
    );
    return count;
  }
}
