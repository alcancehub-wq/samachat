import { Op } from "sequelize";
import Setting from "../models/Setting";

export interface ContactVisibilityGovernanceSettings {
  showAllContactsToAllUsers: boolean;
  showMultipleConversationContactsToAllUsers: boolean;
  fullContactsVisibilityUserIds: number[];
}

const parseBooleanSetting = (value?: string | null): boolean => {
  return String(value || "").toLowerCase() === "true";
};

const parseUserIdsSetting = (value?: string | null): number[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0);
  } catch {
    return [];
  }
};

const GetContactVisibilityGovernanceSettings = async (): Promise<ContactVisibilityGovernanceSettings> => {
  const settings = await Setting.findAll({
    where: {
      key: {
        [Op.in]: [
          "showAllContactsToAllUsers",
          "showMultipleConversationContactsToAllUsers",
          "fullContactsVisibilityUserIds"
        ]
      }
    }
  });

  const values = settings.reduce<Record<string, string>>((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return {
    showAllContactsToAllUsers: parseBooleanSetting(values.showAllContactsToAllUsers),
    showMultipleConversationContactsToAllUsers: parseBooleanSetting(
      values.showMultipleConversationContactsToAllUsers
    ),
    fullContactsVisibilityUserIds: parseUserIdsSetting(values.fullContactsVisibilityUserIds)
  };
};

export default GetContactVisibilityGovernanceSettings;