import Integration from "../../models/Integration";
import Webhook from "../../models/Webhook";
import AppError from "../../errors/AppError";

const ShowIntegrationService = async (
  id: string | number
): Promise<Integration> => {
  const integration = await Integration.findByPk(id, {
    include: [
      {
        model: Webhook,
        attributes: ["id", "name", "url", "isActive"]
      }
    ]
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  return integration;
};

export default ShowIntegrationService;
