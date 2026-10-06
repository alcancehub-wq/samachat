import AppError from "../../errors/AppError";
import { Transaction } from "sequelize";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import ContactCustomField from "../../models/ContactCustomField";
import CrmOriginJournal from "../../models/CrmOriginJournal";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";
import CaptureUpdateContactSourceBridge, {
  UpdateContactSourceContext
} from "../CrmIntegrationServices/CaptureUpdateContactSourceBridge";
import { CrmContactSnapshot } from "../CrmIntegrationServices/BuildCrmContactIntentService";
import { OriginJournalHash } from "../CrmIntegrationServices/CrmOriginJournalService";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
  tagIds?: number[];
  allowMultipleConversations?: boolean;
  city?: string | null;
  state?: string | null;
  captureChannel?: string | null;
  wasReferred?: boolean | null;
  referralType?: string | null;
  referralContactId?: number | null;
  referralContactName?: string | null;
  referralUserId?: number | null;
  referralPartnerName?: string | null;
  referralNote?: string | null;
}

interface Request {
  contactData: ContactData;
  contactId: string;
}

const UpdateContactService = async (
  { contactData, contactId }: Request,
  sourceContext?: UpdateContactSourceContext
): Promise<Contact> => {
  const {
    email,
    name,
    number,
    extraInfo,
    tagIds,
    allowMultipleConversations,
    city,
    state,
    captureChannel,
    wasReferred,
    referralType,
    referralContactId,
    referralContactName,
    referralUserId,
    referralPartnerName,
    referralNote
  } = contactData;

  const persistSource = async (transaction?: Transaction) => {
    const locked = transaction
      ? await Contact.findByPk(contactId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        })
      : null;
    if (transaction && !locked) throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    const before = locked
      ? ({ ...locked.get({ plain: true }) } as CrmContactSnapshot)
      : null;
    let previousPhone: string | null = null;
    if (transaction && before && sourceContext) {
      const previous = await CrmOriginJournal.findOne({
        where: {
          sourceInstanceId: sourceContext.identity.sourceInstanceId,
          sourceContactId: String(before.id)
        },
        order: [["sourceRevision", "DESC"]],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (previous) {
        if (
          previous.organizationId !== sourceContext.identity.organizationId ||
          previous.integrationId !== sourceContext.identity.integrationId
        )
          throw new Error("ORIGIN_TARGET_IDENTITY_CONFLICT");
        if (OriginJournalHash(previous.canonicalBody) !== previous.bodyHash)
          throw new Error("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
        const envelope = JSON.parse(previous.canonicalBody);
        if (
          envelope.source_contact_id !== String(before.id) ||
          envelope.source_instance_id !==
            sourceContext.identity.sourceInstanceId ||
          envelope.organization_id !== sourceContext.identity.organizationId ||
          envelope.integration_id !== sourceContext.identity.integrationId
        )
          throw new Error("ORIGIN_JOURNAL_INTEGRITY_CONFLICT");
        previousPhone = envelope.data.phone_e164;
      }
    }
    const contact = await Contact.findOne({
      where: { id: contactId },
      attributes: [
        "id",
        "name",
        "number",
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
        "referralPartnerName",
        "referralNote"
      ],
      include: ["extraInfo", "tags"],
      ...(transaction ? { transaction } : {})
    });

    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    if (extraInfo) {
      if (transaction) {
        for (const info of extraInfo) {
          if (info.id !== undefined) {
            if (
              !Number.isSafeInteger(info.id) ||
              info.id < 1 ||
              !(await ContactCustomField.findOne({
                where: { id: info.id, contactId: contact.id },
                transaction,
                lock: transaction.LOCK.UPDATE
              }))
            )
              throw new AppError("ERR_CONTACT_EXTRAINFO_SCOPE", 409);
          }
        }
      }
      await Promise.all(
        extraInfo.map(async info => {
          if (transaction)
            await ContactCustomField.upsert(
              { ...info, contactId: contact.id },
              { transaction }
            );
          else
            await ContactCustomField.upsert({ ...info, contactId: contact.id });
        })
      );

      await Promise.all(
        contact.extraInfo.map(async oldInfo => {
          const stillExists = extraInfo.findIndex(
            info => info.id === oldInfo.id
          );

          if (stillExists === -1) {
            await ContactCustomField.destroy({
              where: {
                id: oldInfo.id,
                ...(transaction ? { contactId: contact.id } : {})
              },
              ...(transaction ? { transaction } : {})
            });
          }
        })
      );
    }

    const updatePayload: Partial<ContactData> = {
      name,
      number,
      email,
      city,
      state,
      captureChannel,
      wasReferred,
      referralType,
      referralContactId,
      referralContactName,
      referralUserId,
      referralPartnerName,
      referralNote
    };

    if (typeof allowMultipleConversations === "boolean") {
      updatePayload.allowMultipleConversations = allowMultipleConversations;
    }

    if (transaction) await contact.update(updatePayload, { transaction });
    else await contact.update(updatePayload);

    if (tagIds) {
      if (transaction) await contact.$set("tags", tagIds, { transaction });
      else await contact.$set("tags", tagIds);
    }

    await contact.reload({
      attributes: [
        "id",
        "name",
        "number",
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
        "referralPartnerName",
        "referralNote"
      ],
      include: ["extraInfo", "tags"],
      ...(transaction ? { transaction } : {})
    });
    const persisted = transaction
      ? await Contact.findByPk(contact.id, { transaction })
      : null;
    const after = persisted
      ? ({ ...persisted.get({ plain: true }) } as CrmContactSnapshot)
      : null;
    if (
      transaction &&
      (!before || !after || before.id !== contact.id || after.id !== contact.id)
    )
      throw new Error("ORIGIN_CONTACT_IDENTITY_CONFLICT");
    if (before && after && sourceContext) {
      return {
        contact,
        before: {
          ...before,
          phoneE164:
            sourceContext.previousPhoneE164 !== undefined
              ? sourceContext.previousPhoneE164
              : before.number === after.number
              ? sourceContext.phoneE164
              : previousPhone
        },
        after: { ...after, phoneE164: sourceContext.phoneE164 }
      };
    }
    return { contact, before: null, after: null };
  };

  let result: { contact: Contact; updated: boolean };

  if (sourceContext?.enabled === true) {
    try {
      result = await CaptureUpdateContactSourceBridge(
        Contact,
        sourceContext,
        contactId,
        {
          contactId,
          contactData: {
            email,
            name,
            number,
            extraInfo,
            tagIds,
            allowMultipleConversations,
            city,
            state,
            captureChannel,
            wasReferred,
            referralType,
            referralContactId,
            referralContactName,
            referralUserId,
            referralPartnerName,
            referralNote
          }
        },
        async transaction => {
          const persisted = await persistSource(transaction);
          if (!persisted.before || !persisted.after)
            throw new Error("SOURCE_UPDATE_SNAPSHOTS_MISSING");
          return {
            contact: persisted.contact,
            before: persisted.before,
            after: persisted.after
          };
        },
        async id =>
          Contact.findOne({
            where: { id },
            attributes: [
              "id",
              "name",
              "number",
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
              "referralPartnerName",
              "referralNote"
            ],
            include: ["extraInfo", "tags"]
          })
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          flow: "crm_source_bridge",
          operation: "contact_update",
          contactId
        },
        "CRM source bridge failed; preserving local contact update"
      );
      result = { contact: (await persistSource()).contact, updated: true };
    }
  } else {
    result = { contact: (await persistSource()).contact, updated: true };
  }
  const { contact } = result;

  if (result.updated) {
    void TriggerWebhooksService({
      event: "contact.updated",
      resource: "contact",
      resourceId: contact.id,
      data: contact.get({ plain: true })
    });
  }

  return contact;
};

export default UpdateContactService;