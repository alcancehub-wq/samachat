import AppError from "../../errors/AppError";
import AuthorizeOfficialOutboundOwnershipService from "./AuthorizeOfficialOutboundOwnershipService";

export interface OfficialOutboundConfiguration {
  outboundMode?: string | null;
  ownerUserId: number;
  ownerQueueId?: number | null;
  deliveryWhatsappId?: number | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateComponents?: string | null;
  actorProfile?: string | null;
}

const ValidateOfficialOutboundConfigurationService = async ({
  outboundMode,
  ownerUserId,
  ownerQueueId,
  deliveryWhatsappId,
  templateName,
  templateLanguage,
  templateComponents,
  actorProfile
}: OfficialOutboundConfiguration): Promise<void> => {
  if ((outboundMode || "STANDARD").toUpperCase() !== "OFFICIAL") return;

  if (!ownerQueueId || !deliveryWhatsappId) {
    throw new AppError("ERR_META_OUTBOUND_OWNER_QUEUE_REQUIRED", 400);
  }
  if (!templateName?.trim() || !templateLanguage?.trim()) {
    throw new AppError("ERR_META_TEMPLATE_NAME_LANGUAGE_REQUIRED", 400);
  }
  if (templateComponents) {
    try {
      if (!Array.isArray(JSON.parse(templateComponents))) {
        throw new Error("not array");
      }
    } catch {
      throw new AppError("ERR_META_TEMPLATE_COMPONENTS_INVALID", 400);
    }
  }

  await AuthorizeOfficialOutboundOwnershipService({
    ownerUserId,
    ownerQueueId,
    officialWhatsappId: deliveryWhatsappId,
    actorProfile
  });
};

export default ValidateOfficialOutboundConfigurationService;