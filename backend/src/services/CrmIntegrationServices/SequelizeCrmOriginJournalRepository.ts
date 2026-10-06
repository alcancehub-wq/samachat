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
const decode = (row: CrmOriginJournal, verify = true): OriginJournalEntry => {
  const data = row.get({ plain: true }) as Record<string, unknown>;
  const entry = {
    ...data,
    sourceRevision: Number(data.sourceRevision),
    receipt: typeof data.receipt === "string" ? JSON.parse(data.receipt) : null
  } as unknown as OriginJournalEntry;
  if (verify) VerifyOriginJournalEntry(entry);
  return entry;
};
export type OriginJournalTransition =
  | { kind: "begin_attempt"; attemptId: string; leaseExpiresAt: string }
  | { kind: "transport_accepted"; attemptId: string }
  | { kind: "uncertain"; attemptId: string; code: string; notBefore?: string }
  | { kind: "terminal_failure"; code: string; attemptId?: string }
  | { kind: "receipt"; value: unknown; attemptId?: string; notBefore?: string };

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
    return rows.map(row => decode(row));
  }
  async deliveryCandidate(
    identity: CrmM2mIdentity,
    now: Date,
    maxOperations: number
  ): Promise<OriginJournalEntry | null> {
    const scope = this.scope(identity);
    if (
      !Number.isFinite(+now) ||
      !Number.isSafeInteger(maxOperations) ||
      maxOperations < 1 ||
      maxOperations > 10
    )
      throw new Error("ORIGIN_DELIVERY_POLICY_INVALID");
    const rows = await this.database.query(
      `SELECT candidate.* FROM CrmOriginJournals candidate
       WHERE candidate.sourceInstanceId=:sourceInstanceId AND candidate.integrationId=:integrationId AND candidate.organizationId=:organizationId
         AND (candidate.lastErrorCode IS NULL OR candidate.lastErrorCode <> 'journal_integrity_requires_review')
         AND (candidate.attemptCount < :maxOperations OR candidate.state IN ('attempt_started','transport_accepted'))
         AND candidate.state IN ('intent_persisted','reconciliation_required','receipt_validated','attempt_started','transport_accepted')
         AND (candidate.leaseExpiresAt IS NULL OR candidate.leaseExpiresAt <= :now)
         AND NOT EXISTS (SELECT 1 FROM CrmOriginJournals earlier
           WHERE earlier.sourceInstanceId=candidate.sourceInstanceId AND earlier.sourceContactId=candidate.sourceContactId
             AND earlier.sourceRevision < candidate.sourceRevision AND earlier.state <> 'contact_confirmed')
       ORDER BY candidate.createdAt,candidate.eventId LIMIT 1`,
      {
        type: QueryTypes.SELECT,
        replacements: { ...scope, maxOperations, now: now.toISOString() }
      }
    );
    return rows[0]
      ? decode(
          CrmOriginJournal.build(rows[0], { isNewRecord: false, raw: true }),
          false
        )
      : null;
  }
  async rejectInvalidCandidate(
    identity: CrmM2mIdentity,
    entry: OriginJournalEntry,
    now: Date
  ): Promise<boolean> {
    if (
      entry.organizationId !== identity.organizationId ||
      entry.integrationId !== identity.integrationId ||
      entry.sourceInstanceId !== identity.sourceInstanceId
    )
      return false;
    if (
      !uuid.test(entry.eventId) ||
      !Number.isSafeInteger(entry.stateVersion) ||
      entry.stateVersion < 0
    )
      return false;
    const [count] = await CrmOriginJournal.update(
      {
        state: "reconciliation_required",
        lastErrorCode: "journal_integrity_requires_review",
        leaseExpiresAt: null,
        stateVersion: Sequelize.literal("stateVersion + 1") as unknown as number
      },
      {
        where: {
          ...this.scope(identity),
          eventId: entry.eventId,
          stateVersion: entry.stateVersion,
          bodyHash: entry.bodyHash,
          canonicalBody: entry.canonicalBody,
          [Op.or]: [
            {
              state: {
                [Op.in]: [
                  "intent_persisted",
                  "reconciliation_required",
                  "receipt_validated"
                ]
              }
            },
            {
              state: { [Op.in]: ["attempt_started", "transport_accepted"] },
              leaseExpiresAt: { [Op.lte]: now.toISOString() }
            }
          ]
        },
        fields: ["state", "lastErrorCode", "leaseExpiresAt", "stateVersion"]
      }
    );
    return count === 1;
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
      if (entry.state === "contact_confirmed" && change.kind === "receipt") {
        const late = ValidateOriginJournalReceipt(change.value, entry);
        if (
          ["created", "reused", "enriched"].includes(
            late.contact_result.status
          ) &&
          late.contact_result.crm_contact_id !==
            entry.receipt?.contact_result.crm_contact_id
        )
          throw new Error("ORIGIN_CONFIRMED_RECEIPT_CONFLICT");
        return entry;
      }
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
          entry.leaseExpiresAt &&
          Date.parse(entry.leaseExpiresAt) > now.getTime()
        )
          throw new Error("ORIGIN_ATTEMPT_INVALID");
        const earlier = await CrmOriginJournal.findOne({
          where: {
            sourceInstanceId: entry.sourceInstanceId,
            sourceContactId: entry.sourceContactId,
            sourceRevision: { [Op.lt]: entry.sourceRevision },
            state: { [Op.ne]: "contact_confirmed" }
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (earlier) throw new Error("ORIGIN_EVENT_ORDER_BLOCKED");
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
        entry.leaseExpiresAt = new Date(change.leaseExpiresAt).toISOString();
      } else if (change.kind === "receipt") {
        if (
          change.attemptId &&
          (change.attemptId !== entry.attemptId ||
            !["attempt_started", "transport_accepted"].includes(entry.state))
        )
          throw new Error("ORIGIN_ATTEMPT_ID_CONFLICT");
        if (
          change.notBefore &&
          (!Number.isFinite(Date.parse(change.notBefore)) ||
            Date.parse(change.notBefore) <= now.getTime() ||
            Date.parse(change.notBefore) > now.getTime() + 3600000)
        )
          throw new Error("ORIGIN_BACKOFF_INVALID");
        const receipt = ValidateOriginJournalReceipt(change.value, entry);
        entry.receipt = receipt;
        entry.receiptValidatedAt = entry.receiptValidatedAt || timestamp;
        const contactConfirmed =
          ["created", "reused", "enriched"].includes(
            receipt.contact_result.status
          );

        const commercialConfirmed =
          ["not_requested", "created", "reused"].includes(
            receipt.commercial_result.status
          );

        const confirmed =
          contactConfirmed &&
          commercialConfirmed;

        entry.state = confirmed
          ? "contact_confirmed"
          : receipt.processing_state === "accepted"
          ? "receipt_validated"
          : "reconciliation_required";
        if (confirmed)
          entry.contactConfirmedAt = entry.contactConfirmedAt || timestamp;
        entry.leaseExpiresAt = confirmed
          ? null
          : change.notBefore
          ? new Date(change.notBefore).toISOString()
          : null;
        entry.lastErrorCode = receipt.error?.code || null;
      } else if (change.kind === "terminal_failure") {
        if (
          change.attemptId &&
          (change.attemptId !== entry.attemptId ||
            !["attempt_started", "transport_accepted"].includes(entry.state))
        )
          throw new Error("ORIGIN_ATTEMPT_ID_CONFLICT");
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
          if (
            change.notBefore &&
            (!Number.isFinite(Date.parse(change.notBefore)) ||
              Date.parse(change.notBefore) <= now.getTime() ||
              Date.parse(change.notBefore) > now.getTime() + 3600000)
          )
            throw new Error("ORIGIN_BACKOFF_INVALID");
          entry.leaseExpiresAt = change.notBefore
            ? new Date(change.notBefore).toISOString()
            : null;
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
  async recoverExpired(
    identity: CrmM2mIdentity,
    now: Date,
    eventId?: string
  ): Promise<number> {
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
          ...(eventId ? { eventId } : {}),
          state: { [Op.in]: ["attempt_started", "transport_accepted"] },
          leaseExpiresAt: { [Op.lte]: now.toISOString() }
        },
        fields: ["state", "leaseExpiresAt", "lastErrorCode", "stateVersion"]
      }
    );
    return count;
  }
}
