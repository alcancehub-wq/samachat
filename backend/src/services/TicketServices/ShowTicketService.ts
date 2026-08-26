import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import CheckTicketAccess from "./CheckTicketAccess";

export interface TicketAccessData {
  userId: string | number;
  profile?: string;
}

const ShowTicketService = async (
  id: string | number,
  accessData?: TicketAccessData
): Promise<Ticket> => {
  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "lid", "profilePicUrl"],
        include: ["extraInfo"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name", "providerType", "status", "cloudApiStatus"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"],
        through: { attributes: [] }
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  if (accessData) {
    await CheckTicketAccess({
      ticket,
      userId: accessData.userId,
      profile: accessData.profile
    });
  }

  return ticket;
};

export default ShowTicketService;
