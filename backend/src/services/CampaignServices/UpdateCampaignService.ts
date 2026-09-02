import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import Dialog from "../../models/Dialog";
import ContactList from "../../models/ContactList";
import { stringifyCampaignTagIds } from "./campaignTags";
import {
  CampaignStatus,
  normalizeCampaignStatus
} from "./campaignStatus";
import {
  assertCampaignScheduledAtIsFuture,
  parseCampaignScheduledAt
} from "./campaignSchedule";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";
import ValidateOfficialOutboundConfigurationService from "../OutboundChannelServices/ValidateOfficialOutboundConfigurationService";

interface CampaignData {
  name?: string;
  description?: string;
  dialogId?: number | null;
  contactListId?: number | null;
  tagIds?: number[];
  status?: CampaignStatus;
  isActive?: boolean;
  scheduledAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  ownerQueueId?: number | null;
  deliveryWhatsappId?: number | null;
  outboundMode?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateComponents?: string | null;
}

interface Request {
  campaignId: string;
  campaignData: CampaignData;
}

const UpdateCampaignService = async ({
  campaignId,
  campaignData
}: Request): Promise<Campaign> => {
  const campaign = await Campaign.findOne({
    where: { id: campaignId }
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  const nextName = campaignData.name ? campaignData.name.trim() : undefined;

  if (nextName && nextName !== campaign.name) {
    const existing = await Campaign.findOne({
      where: { name: nextName }
    });

    if (existing) {
      throw new AppError("ERR_DUPLICATED_CAMPAIGN");
    }
  }

  if (campaignData.dialogId) {
    const dialog = await Dialog.findByPk(campaignData.dialogId);
    if (!dialog) {
      throw new AppError("ERR_NO_DIALOG_FOUND", 404);
    }
  }

  if (campaignData.contactListId) {
    const list = await ContactList.findByPk(campaignData.contactListId);
    if (!list) {
      throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
    }
  }

  const incomingStatus =
    typeof campaignData.status === "string"
      ? normalizeCampaignStatus(campaignData.status)
      : undefined;

  const shouldUpdateStatus =
    incomingStatus && incomingStatus !== campaign.status;

  let scheduledAtValue: Date | null = campaign.scheduledAt;
  if (campaignData.scheduledAt !== undefined) {
    if (!campaignData.scheduledAt) {
      scheduledAtValue = null;
    } else {
      scheduledAtValue = parseCampaignScheduledAt(campaignData.scheduledAt);
    }
  }

  const nextStatus = incomingStatus ?? campaign.status;
  const nextIsActive =
    typeof campaignData.isActive === "boolean"
      ? campaignData.isActive
      : campaign.isActive;

  if (nextStatus === "scheduled") {
    if (!scheduledAtValue) {
      throw new AppError("ERR_CAMPAIGN_SCHEDULE_REQUIRED");
    }

    if (nextIsActive) {
      assertCampaignScheduledAtIsFuture(scheduledAtValue);
    }
  }

  const nextOutboundMode = campaignData.outboundMode ?? campaign.outboundMode;
  await ValidateOfficialOutboundConfigurationService({
    outboundMode: nextOutboundMode,
    ownerUserId: Number(campaign.ownerUserId),
    ownerQueueId: campaignData.ownerQueueId ?? campaign.ownerQueueId,
    deliveryWhatsappId: campaignData.deliveryWhatsappId ?? campaign.deliveryWhatsappId,
    templateName: campaignData.templateName ?? campaign.templateName,
    templateLanguage: campaignData.templateLanguage ?? campaign.templateLanguage,
    templateComponents: campaignData.templateComponents ?? campaign.templateComponents
  });

  await campaign.update({
    name: nextName ?? campaign.name,
    description: campaignData.description ?? campaign.description,
    dialogId:
      typeof campaignData.dialogId === "number"
        ? campaignData.dialogId
        : campaign.dialogId,
    contactListId:
      typeof campaignData.contactListId === "number"
        ? campaignData.contactListId
        : campaign.contactListId,
    tagIds:
      campaignData.tagIds !== undefined
        ? stringifyCampaignTagIds(campaignData.tagIds)
        : campaign.tagIds,
    isActive: nextIsActive,
    status: nextStatus,
    scheduledAt: scheduledAtValue,
    reviewedAt:
      campaignData.reviewedAt !== undefined
        ? campaignData.reviewedAt || null
        : campaign.reviewedAt,
      lastStatusAt: shouldUpdateStatus ? new Date() : campaign.lastStatusAt,
      ownerQueueId: campaignData.ownerQueueId ?? campaign.ownerQueueId,
      deliveryWhatsappId: campaignData.deliveryWhatsappId ?? campaign.deliveryWhatsappId,
      outboundMode: nextOutboundMode,
      templateName: campaignData.templateName ?? campaign.templateName,
      templateLanguage: campaignData.templateLanguage ?? campaign.templateLanguage,
      templateComponents: campaignData.templateComponents ?? campaign.templateComponents
  });

  await campaign.reload();

  void TriggerWebhooksService({
    event: "campaign.updated",
    resource: "campaign",
    resourceId: campaign.id,
    data: campaign.get({ plain: true })
  });

  return campaign;
};

export default UpdateCampaignService;
