import { subHours } from "date-fns";
import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import TicketTag from "../../models/TicketTag";
import { getScopedNotificationRoom, getScopedTicketsRoom } from "../../helpers/socketRooms";
import BuildEquivalentContactNumberCandidates from "../../helpers/BuildEquivalentContactNumberCandidates";
import { FOLLOW_UP_TAG_NAME } from "../../utils/followUpTag";
import ShowTicketService from "./ShowTicketService";

const ACTIVE_TICKET_STATUSES = ["open", "pending"];

const removeAutomaticFollowUpTag = async (
  ticketId: number,
  oldStatus?: string | null
): Promise<boolean> => {
  if (oldStatus !== "closed") {
    return false;
  }

  const followUpTag = await Tag.findOne({
    where: { name: FOLLOW_UP_TAG_NAME }
  });

  if (!followUpTag) {
    return false;
  }

  const removedCount = await TicketTag.destroy({
    where: {
      ticketId,
      tagId: followUpTag.id
    }
  });

  return removedCount > 0;
};

const emitAutomaticPendingTransition = ({
  ticket,
  oldStatus,
  oldWhatsappId
}: {
  ticket: Ticket;
  oldStatus?: string | null;
  oldWhatsappId?: number | null;
}): void => {
  if (!["closed", "lost"].includes(String(oldStatus || "")) || ticket.status !== "pending") {
    return;
  }

  const io = getIO();

  io.to(getScopedTicketsRoom(String(oldStatus || ""), oldWhatsappId)).emit("ticket", {
    action: "delete",
    ticketId: ticket.id
  });

  io.to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId))
    .to(ticket.id.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });
};

const resolveNextUnreadMessages = (
  ticket: Ticket,
  incomingUnreadMessages: number
): number => {
  const currentUnreadMessages = Math.max(Number(ticket.unreadMessages) || 0, 0);
  const safeIncomingUnreadMessages = Math.max(Number(incomingUnreadMessages) || 0, 0);

  if (safeIncomingUnreadMessages <= 0) {
    return currentUnreadMessages;
  }

  if (safeIncomingUnreadMessages > currentUnreadMessages) {
    return safeIncomingUnreadMessages;
  }

  return currentUnreadMessages + 1;
};

const getActiveTicketPriority = (ticket: Ticket): number => {
  if (ticket.status === "open" && ticket.userId) {
    return 0;
  }

  if (ticket.status === "open") {
    return 1;
  }

  if (ticket.status === "pending" && ticket.userId) {
    return 2;
  }

  return 3;
};

const sortActiveTicketsByBusinessPriority = (left: Ticket, right: Ticket): number => {
  const priorityDiff = getActiveTicketPriority(left) - getActiveTicketPriority(right);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftUpdatedAt = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
  const rightUpdatedAt = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;

  if (rightUpdatedAt !== leftUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  return Number(right.id || 0) - Number(left.id || 0);
};

const findActiveTicketByContactNumberEquivalence = async (
  contact: Contact,
  whatsappId: number,
  ticketContactId: number
): Promise<Ticket | null> => {
  const numberCandidates = BuildEquivalentContactNumberCandidates(contact.number || "");

  const equivalentContacts = numberCandidates.length
    ? await Contact.findAll({
        where: {
          number: {
            [Op.in]: numberCandidates
          }
        },
        attributes: ["id"]
      })
    : [];

  const contactIds = Array.from(
    new Set([
      ticketContactId,
      contact.id,
      ...equivalentContacts.map(equivalentContact => equivalentContact.id)
    ].filter(Boolean))
  );

  if (!contactIds.length) {
    return null;
  }

  const activeTickets = await Ticket.findAll({
    where: {
      status: {
        [Op.in]: ACTIVE_TICKET_STATUSES
      },
      contactId: {
        [Op.in]: contactIds
      },
      whatsappId
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  if (!activeTickets.length) {
    return null;
  }

  return [...activeTickets].sort(sortActiveTicketsByBusinessPriority)[0];
};

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  groupContact?: Contact
): Promise<Ticket> => {
  const ticketContactId = groupContact ? groupContact.id : contact.id;
  let transitionedTicketId: number | null = null;
  let transitionedFromStatus: string | null = null;
  let transitionedFromWhatsappId: number | null = null;

  let ticket: Ticket | null = null;

  if (!groupContact) {
    ticket = await findActiveTicketByContactNumberEquivalence(
      contact,
      whatsappId,
      ticketContactId
    );
  }

  if (!ticket) {
    ticket = await Ticket.findOne({
      where: {
        status: {
          [Op.or]: ACTIVE_TICKET_STATUSES
        },
        contactId: ticketContactId,
        whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (ticket) {
    await ticket.update({ unreadMessages: resolveNextUnreadMessages(ticket, unreadMessages) });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      transitionedTicketId = ticket.id;
      transitionedFromStatus = ticket.status;
      transitionedFromWhatsappId = ticket.whatsappId;
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        pendingSince: new Date()
      });
    }
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      if (["closed", "lost"].includes(ticket.status)) {
        transitionedTicketId = ticket.id;
        transitionedFromStatus = ticket.status;
        transitionedFromWhatsappId = ticket.whatsappId;
        const preservedUserId = ticket.userId ?? null;
        await ticket.update({
          status: "pending",
          userId: preservedUserId,
          lostAt: null,
          unreadMessages,
          pendingSince: new Date()
        });
      } else {
        await ticket.update({ unreadMessages: resolveNextUnreadMessages(ticket, unreadMessages) });
      }
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: ticketContactId,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      pendingSince: new Date(),
      whatsappId
    });
  }

  if (transitionedTicketId === ticket.id) {
    await removeAutomaticFollowUpTag(ticket.id, transitionedFromStatus);
  }

  ticket = await ShowTicketService(ticket.id);

  if (transitionedTicketId === ticket.id) {
    emitAutomaticPendingTransition({
      ticket,
      oldStatus: transitionedFromStatus,
      oldWhatsappId: transitionedFromWhatsappId
    });
  }

  return ticket;
};

export default FindOrCreateTicketService;
