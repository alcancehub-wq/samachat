import { subHours } from "date-fns";
import { Op } from "sequelize";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { getScopedNotificationRoom, getScopedTicketsRoom } from "../../helpers/socketRooms";
import ShowTicketService from "./ShowTicketService";

const emitAutomaticPendingTransition = ({
  ticket,
  oldStatus,
  oldWhatsappId
}: {
  ticket: Ticket;
  oldStatus?: string | null;
  oldWhatsappId?: number | null;
}): void => {
  if (oldStatus !== "closed" || ticket.status !== "pending") {
    return;
  }

  const io = getIO();

  io.to(getScopedTicketsRoom(oldStatus, oldWhatsappId)).emit("ticket", {
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
    await ticket.update({ unreadMessages });
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
