import Message from "../../models/Message";
import OfficialInboundMessage from "../../models/OfficialInboundMessage";

interface Request {
  ticketId: number;
  contactId: number;
  providerTimestamp: number;
  mediaType?: string;
}

const ResolveOfficialInboundCrossProviderDuplicateService = async ({
  ticketId,
  contactId,
  providerTimestamp,
  mediaType
}: Request): Promise<Message | null> => {
  const normalizedTimestamp = Math.floor(Number(providerTimestamp));

  if (
    !Number.isFinite(normalizedTimestamp) ||
    normalizedTimestamp <= 0
  ) {
    return null;
  }

  const officialFacts = await OfficialInboundMessage.findAll({
    attributes: ["providerMessageId", "providerTimestamp"],
    where: {
      ticketId,
      contactId,
      providerTimestamp: normalizedTimestamp
    },
    limit: 2
  });

  if (officialFacts.length !== 1) {
    return null;
  }

  const providerMessageId = officialFacts[0].providerMessageId;

  if (
    typeof providerMessageId !== "string" ||
    !providerMessageId
  ) {
    return null;
  }

  const existingMessage = await Message.findOne({
    where: {
      id: providerMessageId,
      ticketId,
      contactId,
      fromMe: false
    }
  });

  if (!existingMessage) {
    return null;
  }

  if (
    mediaType &&
    existingMessage.mediaType &&
    existingMessage.mediaType !== mediaType
  ) {
    return null;
  }

  return existingMessage;
};

export default ResolveOfficialInboundCrossProviderDuplicateService;
