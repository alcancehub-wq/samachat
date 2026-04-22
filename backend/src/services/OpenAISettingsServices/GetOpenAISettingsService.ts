import OpenAISetting from "../../models/OpenAISetting";

const GetOpenAISettingsService = async (): Promise<OpenAISetting> => {
  let settings = await OpenAISetting.findOne();

  if (!settings) {
    settings = await OpenAISetting.create({});
  }

  return settings;
};

export default GetOpenAISettingsService;
