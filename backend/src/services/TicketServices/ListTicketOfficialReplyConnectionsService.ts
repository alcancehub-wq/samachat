import { Op } from "sequelize";
import OfficialInboundMessage from "../../models/OfficialInboundMessage";
import OfficialOutboundOrigin from "../../models/OfficialOutboundOrigin";
import ShowTicketService, { TicketAccessData } from "./ShowTicketService";

const ListTicketOfficialReplyConnectionsService = async ({
  ticketId,
  accessData
}: {
  ticketId: string | number;
  accessData: TicketAccessData;
}): Promise<number[]> => {
  const ticket = await ShowTicketService(ticketId, accessData);
  const inboundMessages = await OfficialInboundMessage.findAll({
    where: {
      ticketId: ticket.id,
      contextProviderMessageId: { [Op.ne]: null } as any
    } as any,
    attributes: ["contextProviderMessageId", "deliveryWhatsappId"]
  });
  const contextIds = inboundMessages.reduce<string[]>((result, message) => {
    if (message.contextProviderMessageId) result.push(message.contextProviderMessageId);
    return result;
  }, []);

  if (!contextIds.length) {
    return [];
  }

  const origins = await OfficialOutboundOrigin.findAll({
    where: {
      ticketId: ticket.id,
      providerMessageId: { [Op.in]: contextIds }
    },
    attributes: ["providerMessageId", "deliveryWhatsappId"]
  });
  const originByProviderId = new Map(origins.map(origin => [origin.providerMessageId, origin]));
  const deliveryWhatsappIds = inboundMessages.reduce<number[]>((result, message) => {
    const origin = originByProviderId.get(message.contextProviderMessageId);
    if (origin && origin.deliveryWhatsappId === message.deliveryWhatsappId && !result.includes(origin.deliveryWhatsappId)) {
      result.push(origin.deliveryWhatsappId);
    }
    return result;
  }, []);

  return deliveryWhatsappIds.length === 1 ? deliveryWhatsappIds : [];
};

export default ListTicketOfficialReplyConnectionsService;