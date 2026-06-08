import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ShowContactService from "../ContactServices/ShowContactService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  queueId?: number;
}

const buildExclusiveContactErrorMessage = (responsibleName?: string | null): string => {
  if (responsibleName) {
    return `Este contato já possui atendimento anterior com ${responsibleName}. Para continuar, transfira o contato ou solicite liberação a um administrador.`;
  }

  return "Este contato já possui atendimento anterior com outro responsável. Para continuar, transfira o contato ou solicite liberação a um administrador.";
};

const findConflictingOwnerTicket = async (
  contactId: number,
  userId: number
): Promise<Ticket | null> => {
  const activeTickets = await Ticket.findAll({
    where: {
      contactId,
      status: {
        [Op.in]: ["open", "pending"]
      }
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]]
  });

  const conflictingTickets = activeTickets.filter(
    ticket => ticket.userId && Number(ticket.userId) !== Number(userId)
  );

  if (!conflictingTickets.length) {
    return null;
  }

  const openTicket = conflictingTickets.find(ticket => ticket.status === "open");
  return openTicket || conflictingTickets[0];
};

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(userId);
  const contact = await ShowContactService(contactId);

  if (!contact.allowMultipleConversations) {
    const conflictingOwnerTicket = await findConflictingOwnerTicket(
      contactId,
      userId
    );

    if (conflictingOwnerTicket) {
      const responsibleUser = await User.findByPk(conflictingOwnerTicket.userId, {
        attributes: ["id", "name"]
      });

      throw new AppError(
        buildExclusiveContactErrorMessage(responsibleUser?.name)
      );
    }
  }

  const existingTicket = await Ticket.findOne({
    where: {
      contactId,
      whatsappId: defaultWhatsapp.id,
      status: {
        [Op.or]: ["open", "pending"]
      }
    },
    order: [["updatedAt", "DESC"]]
  });

  if (existingTicket) {
    throw new AppError("ERR_OTHER_OPEN_TICKET");
  }

  await CheckContactOpenTickets(contactId, defaultWhatsapp.id);

  if (queueId === undefined) {
    const user = await User.findByPk(userId, { include: ["queues"] });
    queueId = user?.queues.length === 1 ? user.queues[0].id : undefined;
  }

  const { id }: Ticket = await defaultWhatsapp.$create("ticket", {
    contactId,
    status,
    isGroup: contact.isGroup,
    userId,
		queueId,
		pendingSince: status === "pending" ? new Date() : undefined
  });

  const ticket = await Ticket.findByPk(id, { include: ["contact"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  return ticket;
};

export default CreateTicketService;
