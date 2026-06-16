import { Op } from "sequelize";

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
import TicketTag from "../../models/TicketTag";
import KanbanCard from "../../models/KanbanCard";

type Request = {
  targetContactId: string | number;
  sourceContactId: string | number;
  targetUserId?: string | number | null;
};

const ACTIVE_TICKET_STATUSES = ["open", "pending"];

const normalizeId = (value: string | number): number => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ERR_INVALID_CONTACT_ID");
  }

  return id;
};

const normalizeOptionalId = (value?: string | number | null): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("ERR_INVALID_USER_ID");
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

const resolveResponsibleUserId = (
  activeTickets: Ticket[],
  requestedUserId: number | null
): number | null => {
  if (requestedUserId) {
    return requestedUserId;
  }

  const assignedUserIds = Array.from(
    new Set(
      activeTickets
        .map(ticket => ticket.userId)
        .filter(userId => userId !== null && userId !== undefined)
        .map(userId => Number(userId))
    )
  );

  if (assignedUserIds.length === 1) {
    return assignedUserIds[0];
  }

  return null;
};

const choosePrincipalTicket = (
  activeTickets: Ticket[],
  responsibleUserId: number | null
): Ticket => {
  if (responsibleUserId) {
    const openFromResponsible = activeTickets.find(
      ticket => ticket.status === "open" && Number(ticket.userId) === responsibleUserId
    );

    if (openFromResponsible) {
      return openFromResponsible;
    }

    const anyFromResponsible = activeTickets.find(
      ticket => Number(ticket.userId) === responsibleUserId
    );

    if (anyFromResponsible) {
      return anyFromResponsible;
    }
  }

  const openTicket = activeTickets.find(ticket => ticket.status === "open");

  if (openTicket) {
    return openTicket;
  }

  return activeTickets[0];
};

const mergeTicketTags = async (
  principalTicketId: number,
  duplicateTicketIds: number[],
  transaction: any
): Promise<void> => {
  const duplicateTags = await TicketTag.findAll({
    where: {
      ticketId: {
        [Op.in]: duplicateTicketIds
      }
    },
    transaction
  });

  for (const tag of duplicateTags) {
    await TicketTag.findOrCreate({
      where: {
        ticketId: principalTicketId,
        tagId: tag.tagId
      },
      defaults: {
        ticketId: principalTicketId,
        tagId: tag.tagId
      },
      transaction
    });
  }

  await TicketTag.destroy({
    where: {
      ticketId: {
        [Op.in]: duplicateTicketIds
      }
    },
    transaction
  });
};

const refreshPrincipalTicketSummary = async (
  principalTicket: Ticket,
  responsibleUserId: number | null,
  transaction: any
): Promise<void> => {
  const lastMessage = await Message.findOne({
    where: { ticketId: principalTicket.id },
    order: [["createdAt", "DESC"]],
    transaction
  });

  const unreadMessages = await Message.count({
    where: {
      ticketId: principalTicket.id,
      fromMe: false,
      read: false
    },
    transaction
  });

  await principalTicket.update(
    {
      status: "open",
      userId: responsibleUserId,
      lastMessage: lastMessage?.body || principalTicket.lastMessage || "",
      unreadMessages
    },
    { transaction }
  );
};

const consolidateActiveTickets = async (
  target: Contact,
  source: Contact,
  targetUserId: number | null,
  transaction: any
): Promise<void> => {
  if (target.allowMultipleConversations) {
    return;
  }

  const activeTickets = await Ticket.findAll({
    where: {
      contactId: target.id,
      status: {
        [Op.in]: ACTIVE_TICKET_STATUSES
      }
    },
    order: [
      ["status", "ASC"],
      ["updatedAt", "DESC"]
    ],
    transaction
  });

  if (activeTickets.length <= 1) {
    if (activeTickets.length === 1 && targetUserId) {
      await activeTickets[0].update({ userId: targetUserId, status: "open" }, { transaction });
    }

    return;
  }

  const responsibleUserId = resolveResponsibleUserId(activeTickets, targetUserId);

  if (!responsibleUserId) {
    throw new AppError("ERR_MERGE_REQUIRES_TARGET_USER");
  }

  const principalTicket = choosePrincipalTicket(activeTickets, responsibleUserId);
  const duplicateTickets = activeTickets.filter(ticket => ticket.id !== principalTicket.id);
  const duplicateTicketIds = duplicateTickets.map(ticket => ticket.id);

  if (duplicateTicketIds.length === 0) {
    await refreshPrincipalTicketSummary(principalTicket, responsibleUserId, transaction);
    return;
  }

  await Promise.all([
    Message.update(
      { ticketId: principalTicket.id, contactId: target.id },
      {
        where: {
          ticketId: {
            [Op.in]: duplicateTicketIds
          }
        },
        transaction
      }
    ),
    Schedule.update(
      { ticketId: principalTicket.id, contactId: target.id },
      {
        where: {
          ticketId: {
            [Op.in]: duplicateTicketIds
          }
        },
        transaction
      }
    ),
    Task.update(
      { ticketId: principalTicket.id, contactId: target.id },
      {
        where: {
          ticketId: {
            [Op.in]: duplicateTicketIds
          }
        },
        transaction
      }
    ),
    FlowExecution.update(
      { ticketId: principalTicket.id, contactId: target.id },
      {
        where: {
          ticketId: {
            [Op.in]: duplicateTicketIds
          }
        },
        transaction
      }
    ),
    OpenAILog.update(
      { ticketId: principalTicket.id, contactId: target.id },
      {
        where: {
          ticketId: {
            [Op.in]: duplicateTicketIds
          }
        },
        transaction
      }
    )
  ]);

  await mergeTicketTags(principalTicket.id, duplicateTicketIds, transaction);

  await KanbanCard.destroy({
    where: {
      ticketId: {
        [Op.in]: duplicateTicketIds
      }
    },
    transaction
  });

  await Ticket.update(
    {
      status: "closed",
      userId: responsibleUserId,
      contactId: target.id,
      unreadMessages: 0,
      lastMessage: "Atendimento mesclado ao atendimento principal #" + principalTicket.id
    },
    {
      where: {
        id: {
          [Op.in]: duplicateTicketIds
        }
      },
      transaction
    }
  );

  await refreshPrincipalTicketSummary(principalTicket, responsibleUserId, transaction);
};

const MergeContactService = async ({
  targetContactId,
  sourceContactId,
  targetUserId
}: Request): Promise<{ contact: Contact; mergedContactId: number }> => {
  const targetId = normalizeId(targetContactId);
  const sourceId = normalizeId(sourceContactId);
  const responsibleUserId = normalizeOptionalId(targetUserId);

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

    if (!target.profilePicUrl && source.profilePicUrl) {
      targetUpdates.profilePicUrl = source.profilePicUrl;
    }

    if ((!target.email || target.email === "") && source.email) {
      targetUpdates.email = source.email;
    }

    if (Object.keys(targetUpdates).length > 0) {
      await target.update(targetUpdates, { transaction });
    }

    await consolidateActiveTickets(target, source, responsibleUserId, transaction);

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
