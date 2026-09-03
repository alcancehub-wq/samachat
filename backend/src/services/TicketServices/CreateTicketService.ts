import { Transaction } from "sequelize";
import AppError from "../../errors/AppError";
import sequelize from "../../database";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import ResolveOperationalTicketService from "./ResolveOperationalTicketService";

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

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = userId
    ? await GetDefaultWhatsAppByUser(userId)
    : await GetDefaultWhatsApp();

  if (!defaultWhatsapp) {
    throw new AppError("ERR_USER_WAPP_NOT_FOUND");
  }
  const id = await sequelize.transaction(async (transaction: Transaction) => {
    const contact = await Contact.findByPk(contactId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!contact) {
      throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    const existingTicket = await ResolveOperationalTicketService({
      contactId,
      allowMultipleConversations: contact.allowMultipleConversations,
      whatsappId: defaultWhatsapp.id,
      transaction
    });

    if (existingTicket) {
      const responsibleUser = existingTicket.userId
        ? await User.findByPk(existingTicket.userId, {
            attributes: ["id", "name"],
            transaction
          })
        : null;

      throw new AppError(
        contact.allowMultipleConversations
          ? "ERR_OTHER_OPEN_TICKET"
          : buildExclusiveContactErrorMessage(responsibleUser?.name),
        409
      );
    }

    if (queueId === undefined) {
      const user = await User.findByPk(userId, { include: ["queues"], transaction });
      queueId = user?.queues.length === 1 ? user.queues[0].id : undefined;
    }

    const ticket = await Ticket.create({
      contactId,
      whatsappId: defaultWhatsapp.id,
      status,
      isGroup: contact.isGroup,
      userId,
      queueId,
      pendingSince: status === "pending" ? new Date() : undefined
    }, { transaction });

    return ticket.id;
  });

  const ticket = await Ticket.findByPk(id, { include: ["contact"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  return ticket;
};

export default CreateTicketService;
