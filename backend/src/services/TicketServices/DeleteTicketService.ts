import Ticket from "../../models/Ticket";
import ShowTicketService, { TicketAccessData } from "./ShowTicketService";

interface Request {
  id: string;
  accessData?: TicketAccessData;
}

const DeleteTicketService = async ({
  id,
  accessData
}: Request): Promise<Ticket> => {
  const ticket = await ShowTicketService(id, accessData);

  await ticket.destroy();

  return ticket;
};

export default DeleteTicketService;
