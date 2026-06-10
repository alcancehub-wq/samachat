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

interface Request {
  name: string;
  description?: string;
  dialogId?: number | null;
  contactListId?: number | null;
  tagIds?: number[];
  status?: CampaignStatus;
  isActive?: boolean;
  scheduledAt?: Date | string | null;
  reviewedAt?: Date | string | null;
}

const CreateCampaignService = async ({
  name,
  description,
  dialogId,
  contactListId,
  tagIds,
  status,
  isActive,
  scheduledAt,
  reviewedAt
}: Request): Promise<Campaign> => {
  const trimmedName = name.trim();

  const existing = await Campaign.findOne({
    where: { name: trimmedName }
  });

  if (existing) {
    throw new AppError("ERR_DUPLICATED_CAMPAIGN");
  }

  if (dialogId) {
    const dialog = await Dialog.findByPk(dialogId);
    if (!dialog) {
      throw new AppError("ERR_NO_DIALOG_FOUND", 404);
    }
  }

  if (contactListId) {
    const list = await ContactList.findByPk(contactListId);
    if (!list) {
      throw new AppError("ERR_NO_CONTACT_LIST_FOUND", 404);
    }
  }

  const nextStatus = normalizeCampaignStatus(status);

  let scheduledAtValue: Date | null = null;
  if (scheduledAt) {
    scheduledAtValue = parseCampaignScheduledAt(scheduledAt);
  }

  if (nextStatus === "scheduled") {
    if (!scheduledAtValue) {
      throw new AppError("ERR_CAMPAIGN_SCHEDULE_REQUIRED");
    }

    assertCampaignScheduledAtIsFuture(scheduledAtValue);
  }

  const campaign = await Campaign.create({
    name: trimmedName,
    description,
    dialogId: dialogId || null,
    contactListId: contactListId || null,
    tagIds: stringifyCampaignTagIds(tagIds),
    status: nextStatus,
    isActive: typeof isActive === "boolean" ? isActive : true,
    scheduledAt: scheduledAtValue,
    reviewedAt: reviewedAt || null,
    lastStatusAt: new Date()
  });

  void TriggerWebhooksService({
    event: "campaign.created",
    resource: "campaign",
    resourceId: campaign.id,
    data: campaign.get({ plain: true })
  });

  return campaign;
};

export default CreateCampaignService;
