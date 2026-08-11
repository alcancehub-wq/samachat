import WhatsappDistributionUser from "../../models/WhatsappDistributionUser";
import WhatsappSharingSetting from "../../models/WhatsappSharingSetting";

export type DistributionMode = "random" | "round_robin";

export interface WhatsappSharingSettings {
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode: DistributionMode | null;
  lastAssignedUserId: number | null;
  distributionUserIds: number[];
}

export const DEFAULT_WHATSAPP_SHARING_SETTINGS: WhatsappSharingSettings = {
  isShared: false,
  distributionEnabled: false,
  distributionMode: null,
  lastAssignedUserId: null,
  distributionUserIds: []
};

const normalizeMode = (
  value?: string | null
): DistributionMode | null => {
  if (value === "random" || value === "round_robin") {
    return value;
  }

  return null;
};

const GetWhatsAppSharingSettingsService = async (
  whatsappId: number
): Promise<WhatsappSharingSettings> => {
  const setting = await WhatsappSharingSetting.findOne({
    where: { whatsappId }
  });

  if (!setting || !setting.isShared) {
    return {
      ...DEFAULT_WHATSAPP_SHARING_SETTINGS,
      distributionUserIds: []
    };
  }

  const distributionUsers = await WhatsappDistributionUser.findAll({
    where: { whatsappId },
    order: [["userId", "ASC"]]
  });

  return {
    isShared: true,
    distributionEnabled: Boolean(setting.distributionEnabled),
    distributionMode: setting.distributionEnabled
      ? normalizeMode(setting.distributionMode)
      : null,
    lastAssignedUserId: setting.distributionEnabled
      ? setting.lastAssignedUserId || null
      : null,
    distributionUserIds: setting.distributionEnabled
      ? distributionUsers.map(item => item.userId)
      : []
  };
};

export default GetWhatsAppSharingSettingsService;
