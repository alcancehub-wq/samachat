import Integration from "../../models/Integration";
import Webhook from "../../models/Webhook";
import AppError from "../../errors/AppError";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

const DeleteIntegrationService = async (id: string | number): Promise<void> => {
  const integration = await Integration.findByPk(id);

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  const payload = integration.get({ plain: true });

  await Webhook.update({ integrationId: null }, { where: { integrationId: id } });
  await integration.destroy();

  void TriggerWebhooksService({
    event: "integration.deleted",
    resource: "integration",
    resourceId: integration.id,
    data: payload
  });
};

export default DeleteIntegrationService;
