import AppError from "../../errors/AppError";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Schedule from "../../models/Schedule";
import Task from "../../models/Task";
import FlowExecution from "../../models/FlowExecution";
import OpenAILog from "../../models/OpenAILog";
import CampaignLog from "../../models/CampaignLog";
import ContactCustomField from "../../models/ContactCustomField";
import ContactTag from "../../models/ContactTag";
import ContactListContact from "../../models/ContactListContact";

type Request = {
  targetContactId: string | number;
  sourceContactId: string | number;
};

const normalizeId = (value: string | number): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ERR_INVALID_CONTACT_ID");
  }

  return id;
};

const haveEquivalentIdentity = (target: Contact, source: Contact): boolean => {
  const targetNumber = target.number || "";
  const sourceNumber = source.number || "";

  const targetCandidates = BuildEquivalentContactNumberCandidates(targetNumber);
  const sourceCandidates = BuildEquivalentContactNumberCandidates(sourceNumber);

  const equivalentNumber =
    Boolean(targetNumber && sourceNumber) &&
    (targetCandidates.includes(sourceNumber) || sourceCandidates.includes(targetNumber));

  const equivalentLid =
    Boolean(target.lid && source.lid) &&
    target.lid === source.lid;

  return equivalentNumber || equivalentLid;
};

const MergeContactService = async ({
  targetContactId,
  sourceContactId
}: Request): Promise<{ contact: Contact; mergedContactId: number }> => {
  const targetId = normalizeId(targetContactId);
  const sourceId = normalizeId(sourceContactId);

  if (targetId === sourceId) {
    throw new AppError("ERR_CANNOT_MERGE_SAME_CONTACT");
  }

  const sequelize = Contact.sequelize;

  if (!sequelize) {
    throw new AppError("ERR_DATABASE_CONNECTION_NOT_FOUND");
  }

  return sequelize.transaction(async transaction => {
    const target = await Contact.findByPk(targetId, { transaction });
    const source = await Contact.findByPk(sourceId, { transaction });

    if (!target || !source) {
      throw new AppError("ERR_NO_CONTACT_FOUND");
    }

    if (target.isGroup || source.isGroup) {
      throw new AppError("ERR_CANNOT_MERGE_GROUP_CONTACTS");
    }

    if (!haveEquivalentIdentity(target, source)) {
      throw new AppError("ERR_CONTACTS_ARE_NOT_DUPLICATED");
    }

    const sourceTags = await ContactTag.findAll({
      where: { contactId: source.id },
      transaction
    });

    for (const tag of sourceTags) {
      await ContactTag.findOrCreate({
        where: {
          contactId: target.id,
          tagId: tag.tagId
        },
        defaults: {
          contactId: target.id,
          tagId: tag.tagId
        },
        transaction
      });
    }

    await ContactTag.destroy({
      where: { contactId: source.id },
      transaction
    });

    const sourceLists = await ContactListContact.findAll({
      where: { contactId: source.id },
      transaction
    });

    for (const list of sourceLists) {
      await ContactListContact.findOrCreate({
        where: {
          contactListId: list.contactListId,
          contactId: target.id
        },
        defaults: {
          contactListId: list.contactListId,
          contactId: target.id
        },
        transaction
      });
    }

    await ContactListContact.destroy({
      where: { contactId: source.id },
      transaction
    });

    await Promise.all([
      Ticket.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      Message.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      Message.update(
        { vcardContactId: target.id } as any,
        { where: { vcardContactId: source.id } as any, transaction }
      ),
      Schedule.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      Task.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      FlowExecution.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      OpenAILog.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      CampaignLog.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      ),
      ContactCustomField.update(
        { contactId: target.id },
        { where: { contactId: source.id }, transaction }
      )
    ]);

    const targetUpdates: Partial<Contact> = {};

    if (!target.allowMultipleConversations && source.allowMultipleConversations) {
      targetUpdates.allowMultipleConversations = true;
    }

    if (!target.profilePicUrl && source.profilePicUrl) {
      targetUpdates.profilePicUrl = source.profilePicUrl;
    }

    if ((!target.email || target.email === "") && source.email) {
      targetUpdates.email = source.email;
    }

    if (Object.keys(targetUpdates).length > 0) {
      await target.update(targetUpdates, { transaction });
    }

    await source.destroy({ transaction });

    const mergedContact = await Contact.findByPk(target.id, {
      transaction,
      include: ["extraInfo", "tags"]
    });

    if (!mergedContact) {
      throw new AppError("ERR_NO_CONTACT_FOUND");
    }

    return {
      contact: mergedContact,
      mergedContactId: source.id
    };
  });
};

export default MergeContactService;
