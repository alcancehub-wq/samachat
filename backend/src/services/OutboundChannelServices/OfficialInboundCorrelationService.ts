import OfficialInboundMessage from "../../models/OfficialInboundMessage";
import OfficialOutboundOrigin from "../../models/OfficialOutboundOrigin";

interface PersistOfficialInboundFactsRequest {
  providerMessageId: string;
  providerTimestamp: number;
  contextProviderMessageId?: string;
  deliveryWhatsappId: number;
  contactId: number;
  ticketId: number;
}

export const PersistOfficialInboundFactsService = async (
  input: PersistOfficialInboundFactsRequest
): Promise<OfficialInboundMessage> => {
  const [inboundMessage] = await OfficialInboundMessage.findOrCreate({
    where: { providerMessageId: input.providerMessageId },
    defaults: input
  });

  return inboundMessage;
};

export const GetLastOfficialInboundTimestampService = async (
  ticketId: number,
  deliveryWhatsappId: number
): Promise<number | null> => {
  const inboundMessage = await OfficialInboundMessage.findOne({
    where: { ticketId, deliveryWhatsappId },
    order: [["providerTimestamp", "DESC"]]
  });

  return inboundMessage?.providerTimestamp || null;
};

export const ResolveOfficialInboundCorrelationService = async (
  providerMessageId: string
): Promise<OfficialOutboundOrigin | null> => {
  const inboundMessage = await OfficialInboundMessage.findByPk(providerMessageId);

  if (!inboundMessage?.contextProviderMessageId) {
    return null;
  }

  return OfficialOutboundOrigin.findOne({
    where: {
      providerMessageId: inboundMessage.contextProviderMessageId,
      contactId: inboundMessage.contactId,
      deliveryWhatsappId: inboundMessage.deliveryWhatsappId,
      ticketId: inboundMessage.ticketId
    }
  });
};