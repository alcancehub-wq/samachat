import Campaign from "../../models/Campaign";
import AppError from "../../errors/AppError";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

const DeleteCampaignService = async (id: string | number): Promise<void> => {
  const campaign = await Campaign.findByPk(id);

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  const payload = campaign.get({ plain: true });

  await campaign.destroy();

  void TriggerWebhooksService({
    event: "campaign.deleted",
    resource: "campaign",
    resourceId: campaign.id,
    data: payload
  });
};

export default DeleteCampaignService;
