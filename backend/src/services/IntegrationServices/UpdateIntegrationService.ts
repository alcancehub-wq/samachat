import AppError from "../../errors/AppError";
import Integration from "../../models/Integration";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

interface IntegrationData {
  name?: string;
  type?: string;
  description?: string;
  isActive?: boolean;
}

interface Request {
  integrationId: string;
  integrationData: IntegrationData;
}

const allowedTypes = ["custom", "crm", "make"];

const UpdateIntegrationService = async ({
  integrationId,
  integrationData
}: Request): Promise<Integration> => {
  const integration = await Integration.findOne({
    where: { id: integrationId }
  });

  if (!integration) {
    throw new AppError("ERR_NO_INTEGRATION_FOUND", 404);
  }

  const nextName = integrationData.name ? integrationData.name.trim() : undefined;
  const nextType = integrationData.type
    ? String(integrationData.type).toLowerCase()
    : undefined;

  if (nextType && !allowedTypes.includes(nextType)) {
    throw new AppError("ERR_INTEGRATION_TYPE_INVALID");
  }

  if (nextName && nextName !== integration.name) {
    const existing = await Integration.findOne({
      where: { name: nextName }
    });

    if (existing) {
      throw new AppError("ERR_DUPLICATED_INTEGRATION");
    }
  }

  await integration.update({
    name: nextName ?? integration.name,
    type: nextType ?? integration.type,
    description: integrationData.description ?? integration.description,
    isActive:
      typeof integrationData.isActive === "boolean"
        ? integrationData.isActive
        : integration.isActive
  });

  await integration.reload();

  void TriggerWebhooksService({
    event: "integration.updated",
    resource: "integration",
    resourceId: integration.id,
    data: integration.get({ plain: true })
  });

  return integration;
};

export default UpdateIntegrationService;
