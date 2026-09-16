import MetaMessageTemplateVariableMappingModel from "../../models/MetaMessageTemplateVariableMapping";

interface Request {
  whatsappId: number;
  templateName: string;
  templateLanguage?: string | null;
}

const DeleteMetaMessageTemplateVariableMappingService = async ({
  whatsappId,
  templateName,
  templateLanguage
}: Request): Promise<void> => {
  const where: {
    whatsappId: number;
    templateName: string;
    templateLanguage?: string;
  } = {
    whatsappId,
    templateName: String(
      templateName || ""
    ).trim()
  };

  const cleanLanguage = String(
    templateLanguage || ""
  ).trim();

  if (cleanLanguage) {
    where.templateLanguage = cleanLanguage;
  }

  await MetaMessageTemplateVariableMappingModel.destroy({
    where
  });
};

export default DeleteMetaMessageTemplateVariableMappingService;