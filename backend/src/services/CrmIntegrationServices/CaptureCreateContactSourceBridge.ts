import { Model, ModelCtor, QueryTypes, Transaction } from "sequelize";
import { CrmContactSnapshot } from "./BuildCrmContactIntentService";
import { CrmM2mIdentity } from "./CrmM2mClient";
import CrmOriginJournalService, {
  OriginCaptureRequest,
  OriginJournalRepository
} from "./CrmOriginJournalService";
import SequelizeCrmOriginJournalRepository from "./SequelizeCrmOriginJournalRepository";

export interface CreateContactSourceContext
  extends Omit<OriginCaptureRequest, "mutation"> {
  readonly enabled: boolean;
  readonly identity: CrmM2mIdentity;
}

export default async function CaptureCreateContactSourceBridge<
  ContactModel extends Model
>(
  contactModel: ModelCtor<ContactModel>,
  context: CreateContactSourceContext,
  producerInput: Readonly<Record<string, unknown>>,
  persistSource: (transaction: Transaction) => Promise<ContactModel>
): Promise<{ contact: ContactModel; created: boolean }> {
  if (context.enabled !== true) throw new Error("SOURCE_BRIDGE_DISABLED");
  const database = contactModel.sequelize;
  if (!database) throw new Error("SOURCE_BRIDGE_MODEL_NOT_INITIALIZED");
  const store = new SequelizeCrmOriginJournalRepository(database, contactModel);
  const tables = [
    "Contacts",
    "ContactCustomFields",
    "ContactTags",
    "CrmOriginJournals",
    "CrmOriginCaptureCommands"
  ];
  const engines = await database.query<{
    tableName: string;
    engine: string;
    caseMode: number;
  }>(
    "SELECT TABLE_NAME AS tableName,ENGINE AS engine,@@lower_case_table_names AS caseMode FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (:tables)",
    { type: QueryTypes.SELECT, replacements: { tables } }
  );
  if (
    tables.some(
      table =>
        !engines.some(
          row =>
            row.engine === "InnoDB" &&
            ([1, 2].includes(Number(row.caseMode))
              ? row.tableName.toLowerCase() === table.toLowerCase()
              : row.tableName === table)
        )
    )
  )
    throw new Error("SOURCE_BRIDGE_SCHEMA_NOT_TRANSACTIONAL");
  let contact: ContactModel | null = null;
  const repository: OriginJournalRepository = {
    transaction: work =>
      store.transaction(work, async (_mutation, transaction) => {
        contact = await persistSource(transaction);
        return {
          before: null,
          after: contact.get({ plain: true }) as CrmContactSnapshot
        };
      })
  };
  const service = new CrmOriginJournalService(repository, {
    enabled: true,
    identity: context.identity
  });
  const capture: OriginCaptureRequest & {
    readonly producer: string;
    readonly producerInput: Readonly<Record<string, unknown>>;
  } = {
    captureKey: context.captureKey,
    correlationId: context.correlationId,
    phoneE164: context.phoneE164,
    bindingStatus: context.bindingStatus,
    context: context.context,
    metadata: context.metadata,
    producer: "CreateContactService",
    producerInput,
    mutation: {
      kind: "create",
      data: {
        name: producerInput.name as string,
        number: producerInput.number as string,
        isGroup: false
      }
    }
  };
  const outcome = await service.capture(capture);
  if (outcome.source !== "committed")
    throw new Error("SOURCE_BRIDGE_NOT_COMMITTED");
  if (contact) return { contact, created: true };
  const replay = await contactModel.findByPk<ContactModel>(outcome.contactId, {
    include: ["extraInfo", "tags"]
  });
  if (!replay) throw new Error("SOURCE_BRIDGE_REPLAY_CONTACT_MISSING");
  return { contact: replay, created: false };
}
