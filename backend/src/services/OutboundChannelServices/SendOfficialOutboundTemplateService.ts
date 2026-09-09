import AppError from "../../errors/AppError";
import CloudApiClient from "../CloudApiServices/CloudApiClient";
import { createMetaMessageTemplateGetExecutor } from "../MetaMessageTemplateServices/MetaMessageTemplateHttpExecutor";
import ResolveApprovedMetaMessageTemplateService from "../MetaMessageTemplateServices/ResolveApprovedMetaMessageTemplateService";
import OfficialOutboundOrigin from "../../models/OfficialOutboundOrigin";
import ResolveOutboundChannelService from "./ResolveOutboundChannelService";

interface Request {
  consumerType: "schedule" | "campaign" | "flow";
  consumerId: number;
  ownerUserId: number;
  ownerQueueId: number;
  deliveryWhatsappId: number;
  contactId: number;
  contactNumber: string;
  ticketId?: number | null;
  templateName: string;
  templateLanguage: string;
  templateComponents?: string | null;
}

const parseComponents = (
  value?: string | null
): Array<Record<string, unknown>> | undefined => {
  if (!value) return undefined;
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item !== "object")) {
    throw new AppError("ERR_META_TEMPLATE_COMPONENTS_INVALID", 400);
  }
  return parsed as Array<Record<string, unknown>>;
};

const SendOfficialOutboundTemplateService = async (request: Request): Promise<string | null> => {
  const channel = await ResolveOutboundChannelService({
    mode: "OFFICIAL",
    context: request.consumerType,
    ownerUserId: request.ownerUserId,
    actorQueueIds: [request.ownerQueueId],
    officialWhatsappId: request.deliveryWhatsappId
  });
  const template = await ResolveApprovedMetaMessageTemplateService({
    connection: channel.whatsapp,
    name: request.templateName,
    language: request.templateLanguage,
    getExecutor: createMetaMessageTemplateGetExecutor()
  });
  const client = new CloudApiClient({
    accessToken: channel.whatsapp.accessToken,
    phoneNumberId: channel.whatsapp.phoneNumberId,
    apiVersion: channel.whatsapp.apiVersion
  });
  const result = await client.sendTemplate({
    to: request.contactNumber,
    name: request.templateName,
    languageCode: request.templateLanguage,
    components: parseComponents(request.templateComponents)
  });
  const providerMessageId = result.messages?.[0]?.id || null;
  await OfficialOutboundOrigin.create({
    consumerType: request.consumerType,
    consumerId: request.consumerId,
    ownerUserId: request.ownerUserId,
    ownerQueueId: request.ownerQueueId,
    deliveryWhatsappId: request.deliveryWhatsappId,
    contactId: request.contactId,
    ticketId: request.ticketId || null,
    providerMessageId
  });
  return providerMessageId;
};

export default SendOfficialOutboundTemplateService;