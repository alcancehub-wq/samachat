import { subHours } from "date-fns";
import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import TicketTag from "../../models/TicketTag";
import {
  getScopedNotificationRoom,
  getScopedTicketsRoom,
  getUserScopedNotificationRoom,
  getUserScopedTicketsRoom
} from "../../helpers/socketRooms";
import GetOperationalOwnerUserId from "../../helpers/GetOperationalOwnerUserId";
import { FOLLOW_UP_TAG_NAME } from "../../utils/followUpTag";
import ShowTicketService from "./ShowTicketService";

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
  oldWhatsappId,
  oldUserId
}: {
  ticket: Ticket;
  oldStatus?: string | null;
  oldWhatsappId?: number | null;
  oldUserId?: number | null;
}): void => {
  if (oldStatus !== "closed" || ticket.status !== "pending") {
    return;
  }

  const io = getIO();

  let deleteBroadcaster = io.to(getScopedTicketsRoom(oldStatus, oldWhatsappId));

  if (oldUserId) {
    deleteBroadcaster = deleteBroadcaster.to(
      getUserScopedTicketsRoom(oldStatus, oldUserId)
    );
  }

  deleteBroadcaster.emit("ticket", {
    action: "delete",
    ticketId: ticket.id
  });

  let updateBroadcaster = io
    .to(getScopedTicketsRoom(ticket.status, ticket.whatsappId))
    .to(getScopedNotificationRoom(ticket.whatsappId));

  if (ticket.userId) {
    updateBroadcaster = updateBroadcaster
      .to(getUserScopedTicketsRoom(ticket.status, ticket.userId))
      .to(getUserScopedNotificationRoom(ticket.userId));
  }

  updateBroadcaster.to(ticket.id.toString()).emit("ticket", {
    action: "update",
    ticket
  });
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
  let transitionedFromUserId: number | null = null;
  let resolvedOwnerUserId: number | null | undefined;

  const getOwnerUserId = async (): Promise<number | null> => {
    if (resolvedOwnerUserId !== undefined) {
      return resolvedOwnerUserId;
    }

    resolvedOwnerUserId = await GetOperationalOwnerUserId(whatsappId);
    return resolvedOwnerUserId;
  };

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: ticketContactId,
      whatsappId
    },
    order: [["updatedAt", "DESC"]]
  });

  if (ticket) {
    const ownerUserId = ticket.userId ?? (await getOwnerUserId());
    await ticket.update({
      unreadMessages,
      ...(ticket.userId == null && ownerUserId != null ? { userId: ownerUserId } : {})
    });
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
      const ownerUserId = ticket.userId ?? (await getOwnerUserId());
      transitionedTicketId = ticket.id;
      transitionedFromStatus = ticket.status;
      transitionedFromWhatsappId = ticket.whatsappId;
      transitionedFromUserId = ticket.userId ?? null;
      await ticket.update({
        status: "pending",
        userId: ownerUserId,
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
      const ownerUserId = ticket.userId ?? (await getOwnerUserId());
      transitionedTicketId = ticket.id;
      transitionedFromStatus = ticket.status;
      transitionedFromWhatsappId = ticket.whatsappId;
      transitionedFromUserId = ticket.userId ?? null;
      await ticket.update({
        status: "pending",
        userId: ownerUserId,
        unreadMessages,
        pendingSince: new Date()
      });
    }
  }

  if (!ticket) {
    const ownerUserId = await getOwnerUserId();
    ticket = await Ticket.create({
      contactId: ticketContactId,
      status: "pending",
      isGroup: !!groupContact,
      userId: ownerUserId,
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
      oldWhatsappId: transitionedFromWhatsappId,
      oldUserId: transitionedFromUserId
    });
  }

  return ticket;
};

export default FindOrCreateTicketService;
