import CampaignLog from "../../models/CampaignLog";
import { sanitizeOutboundAuditText } from "../../utils/sanitizeOutboundAudit";

interface Request {
  campaignId: number;
  contactId: number;
  status: string;
  message?: string;
  error?: string;
  executedAt?: Date | string | null;
}

const CreateCampaignLogService = async ({
  campaignId,
  contactId,
  status,
  message,
  error,
  executedAt
}: Request): Promise<CampaignLog> => {
  let executedAtValue: Date | null = null;

  if (executedAt) {
    const parsed = new Date(executedAt);
    executedAtValue = Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const log = await CampaignLog.create({
    campaignId,
    contactId,
    status,
    message: sanitizeOutboundAuditText(message),
    error: sanitizeOutboundAuditText(error),
    executedAt: executedAtValue
  });

  return log;
};

export default CreateCampaignLogService;
