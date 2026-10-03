import { Model, ModelCtor, Transaction } from "sequelize";
import { CrmContactSnapshot } from "./BuildCrmContactIntentService";
import { CreateContactSourceContext } from "./CaptureCreateContactSourceBridge";
import CrmOriginJournalService, {
  OriginCaptureOutcome,
  OriginJournalRepository,
  OriginCaptureRequest
} from "./CrmOriginJournalService";
import SequelizeCrmOriginJournalRepository from "./SequelizeCrmOriginJournalRepository";
import VerifyContactSourceBridgeSchema from "./VerifyContactSourceBridgeSchema";

export interface UpdateContactSourceContext extends CreateContactSourceContext {
  readonly previousPhoneE164?: string | null;
}
export interface UpdateContactSourceResult<ContactModel extends Model> {
  readonly contact: ContactModel;
  readonly before: CrmContactSnapshot;
  readonly after: CrmContactSnapshot;
}
export default async function CaptureUpdateContactSourceBridge<
  ContactModel extends Model
>(
  contactModel: ModelCtor<ContactModel>,
  context: UpdateContactSourceContext,
  contactId: string,
  producerInput: Readonly<Record<string, unknown>>,
  persistSource: (
    transaction: Transaction
  ) => Promise<UpdateContactSourceResult<ContactModel>>,
  reloadReplay: (contactId: number) => Promise<ContactModel | null>
): Promise<{ contact: ContactModel; updated: boolean }> {
  if (context.enabled !== true) throw new Error("SOURCE_BRIDGE_DISABLED");
  if (!/^[1-9]\d*$/.test(contactId) || !Number.isSafeInteger(Number(contactId)))
    throw new Error("SOURCE_UPDATE_CONTACT_ID_INVALID");
  const database = contactModel.sequelize;
  if (!database) throw new Error("SOURCE_BRIDGE_MODEL_NOT_INITIALIZED");
  const store = new SequelizeCrmOriginJournalRepository(database, contactModel);
  await VerifyContactSourceBridgeSchema(database);
  let contact: ContactModel | null = null;
  let originalResult: Record<string, unknown> | null = null;
  const repository: OriginJournalRepository = {
    transaction: work =>
      store.transaction(
        unit =>
          work({
            ...unit,
            lockCommand: async (request, identity, inputHash) => {
              const outcome = await unit.lockCommand(
                request,
                identity,
                inputHash
              );
              if (outcome)
                originalResult =
                  (
                    outcome as OriginCaptureOutcome & {
                      producerResult?: Record<string, unknown>;
                    }
                  ).producerResult || null;
              return outcome;
            },
            completeCommand: async (captureKey, outcome) => {
              const completed: OriginCaptureOutcome & {
                producerResult: Record<string, unknown> | null;
              } = { ...outcome, producerResult: originalResult };
              await unit.completeCommand(captureKey, completed);
            }
          }),
        async (_mutation, transaction) => {
          const result = await persistSource(transaction);
          if (
            result.before.id !== Number(contactId) ||
            result.after.id !== Number(contactId)
          )
            throw new Error("ORIGIN_CONTACT_IDENTITY_CONFLICT");
          contact = result.contact;
          originalResult = contact.get({ plain: true }) as Record<
            string,
            unknown
          >;
          if (Buffer.byteLength(JSON.stringify(originalResult), "utf8") > 32768)
            throw new Error("SOURCE_UPDATE_RESULT_LIMIT");
          return { before: result.before, after: result.after };
        }
      )
  };
  const service = new CrmOriginJournalService(repository, {
    enabled: true,
    identity: context.identity
  });
  const request: OriginCaptureRequest & {
    previousPhoneE164?: string | null;
    producer: string;
    producerInput: Readonly<Record<string, unknown>>;
  } = {
    captureKey: context.captureKey,
    correlationId: context.correlationId,
    phoneE164: context.phoneE164,
    bindingStatus: context.bindingStatus,
    context: context.context,
    metadata: context.metadata,
    previousPhoneE164: context.previousPhoneE164,
    producer: "UpdateContactService",
    producerInput,
    mutation: { kind: "update", contactId: Number(contactId), data: {} }
  };
  const outcome = await service.capture(request);
  if (outcome.source !== "committed")
    throw new Error("SOURCE_BRIDGE_NOT_COMMITTED");
  if (contact) return { contact, updated: true };
  const replay = await reloadReplay(outcome.contactId);
  if (!replay) throw new Error("SOURCE_BRIDGE_REPLAY_CONTACT_MISSING");
  const saved = originalResult as Record<string, unknown> | null;
  if (!saved || saved.id !== outcome.contactId)
    throw new Error("SOURCE_UPDATE_REPLAY_RESULT_MISSING");
  return {
    contact: contactModel.build<ContactModel>(saved, {
      isNewRecord: false,
      raw: true,
      include: ["extraInfo", "tags"]
    }),
    updated: false
  };
}
