import AppError from "../../errors/AppError";
import MetaMessageTemplateVariableMappingModel from "../../models/MetaMessageTemplateVariableMapping";
import { MetaMessageTemplateVariableMapping } from "./types";

interface Request {
  whatsappId: number;
  templateName: string;
  templateLanguage: string;
  variableMapping: MetaMessageTemplateVariableMapping[];
}

const SaveMetaMessageTemplateVariableMappingService = async ({
  whatsappId,
  templateName,
  templateLanguage,
  variableMapping
}: Request): Promise<MetaMessageTemplateVariableMapping[]> => {
  const cleanName = String(
    templateName || ""
  ).trim();

  const cleanLanguage = String(
    templateLanguage || ""
  ).trim();

  if (
    !Number.isInteger(whatsappId) ||
    whatsappId <= 0 ||
    !cleanName ||
    !cleanLanguage
  ) {
    throw new AppError(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_IDENTITY_REQUIRED",
      400
    );
  }

  const sequelize =
    MetaMessageTemplateVariableMappingModel.sequelize;

  if (!sequelize) {
    throw new AppError(
      "ERR_META_TEMPLATE_VARIABLE_MAPPING_DATABASE_UNAVAILABLE"
    );
  }

  await sequelize.transaction(
    async transaction => {
      await MetaMessageTemplateVariableMappingModel.destroy({
        where: {
          whatsappId,
          templateName: cleanName,
          templateLanguage: cleanLanguage
        },
        transaction
      });

      if (variableMapping.length === 0) {
        return;
      }

      await MetaMessageTemplateVariableMappingModel.bulkCreate(
        variableMapping.map(mapping => ({
          whatsappId,
          templateName: cleanName,
          templateLanguage: cleanLanguage,
          componentType: mapping.componentType,
          position: mapping.position,
          variableKey: mapping.variableKey
        })),
        {
          transaction
        }
      );
    }
  );

  return variableMapping;
};

export default SaveMetaMessageTemplateVariableMappingService;