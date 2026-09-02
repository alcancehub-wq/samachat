import { logger } from "../../utils/logger";
import OfficialOutboundOrigin from "../../models/OfficialOutboundOrigin";

interface Request {
  contactId: number;
  deliveryWhatsappId: number;
}

const ResolveOfficialInboundOriginService = async ({
  contactId,
  deliveryWhatsappId
}: Request): Promise<OfficialOutboundOrigin | null> => {
  const origins = await OfficialOutboundOrigin.findAll({
    where: { contactId, deliveryWhatsappId },
    order: [["createdAt", "DESC"]],
    limit: 2
  });

  if (origins.length !== 1) {
    if (origins.length > 1) {
      logger.warn(
        { event: "official_outbound_origin_conflict", contactId, deliveryWhatsappId },
        "Official inbound origin is ambiguous; using normal distribution"
      );
    }
    return null;
  }

  return origins[0];
};

export default ResolveOfficialInboundOriginService;