import Campaign from "../../models/Campaign";
import Dialog from "../../models/Dialog";
import ContactList from "../../models/ContactList";
import AppError from "../../errors/AppError";

const ShowCampaignService = async (
  id: string | number
): Promise<Campaign> => {
  const campaign = await Campaign.findByPk(id, {
    include: [
      {
        model: Dialog,
        attributes: ["id", "name", "isActive"]
      },
      {
        model: ContactList,
        attributes: ["id", "name", "isDynamic", "isActive"]
      }
    ]
  });

  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  return campaign;
};

export default ShowCampaignService;
