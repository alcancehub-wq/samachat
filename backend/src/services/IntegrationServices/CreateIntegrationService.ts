import { v4 as uuidv4 } from "uuid";
import AppError from "../../errors/AppError";
import Integration from "../../models/Integration";
import TriggerWebhooksService from "../WebhookServices/TriggerWebhooksService";

interface Request {
  name: string;
  type?: string;
  description?: string;
  isActive?: boolean;
}

const allowedTypes = ["custom", "crm", "make"];

const CreateIntegrationService = async ({
  name,
  type = "custom",
  description,
  isActive = true
}: Request): Promise<Integration> => {
  const trimmedName = name.trim();
  const normalizedType = String(type).toLowerCase();

  if (!allowedTypes.includes(normalizedType)) {
    throw new AppError("ERR_INTEGRATION_TYPE_INVALID");
  }

  const existing = await Integration.findOne({
    where: { name: trimmedName }
  });

  if (existing) {
    throw new AppError("ERR_DUPLICATED_INTEGRATION");
  }

  const integration = await Integration.create({
    name: trimmedName,
    type: normalizedType,
    description,
    isActive,
    apiKey: uuidv4()
  });

  void TriggerWebhooksService({
    event: "integration.created",
    resource: "integration",
    resourceId: integration.id,
    data: integration.get({ plain: true })
  });

  return integration;
};

export default CreateIntegrationService;
