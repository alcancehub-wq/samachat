import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
}

const SETTINGS_ALLOWED_TO_CREATE = [
  "showAllContactsToAllUsers",
  "showMultipleConversationContactsToAllUsers",
  "fullContactsVisibilityUserIds"
];

const getDefaultValueForCreatedSetting = (key: string): string => {
  if (key === "fullContactsVisibilityUserIds") {
    return "[]";
  }

  return "false";
};

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  let setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    if (!SETTINGS_ALLOWED_TO_CREATE.includes(key)) {
      throw new AppError("ERR_NO_SETTING_FOUND", 404);
    }

    setting = await Setting.create({
      key,
      value: value || getDefaultValueForCreatedSetting(key)
    } as Setting);

    return setting;
  }

  await setting.update({ value });

  return setting;
};

export default UpdateSettingService;