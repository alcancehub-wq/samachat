import AppError from "../../errors/AppError";
import MetaMessageTemplateClient, {
  MetaMessageTemplatePostExecutor
} from "./MetaMessageTemplateClient";
import {
  MetaMessageTemplate,
  MetaMessageTemplateCreateResponse
} from "./types";
import { MetaMessageTemplateConnectionContext } from "./ListMetaMessageTemplatesService";
import ValidateMetaMessageTemplateVariableMappingService from "./ValidateMetaMessageTemplateVariableMappingService";
import SaveMetaMessageTemplateVariableMappingService from "./SaveMetaMessageTemplateVariableMappingService";

interface CreateMetaMessageTemplateRequest {
  connection: MetaMessageTemplateConnectionContext;
  template: MetaMessageTemplate;
  variableMapping?: unknown;
  postExecutor: MetaMessageTemplatePostExecutor;
}

const normalizeProviderType = (
  providerType?: string | null
): string => {
  return (providerType || "")
    .trim()
    .toLowerCase();
};

const CreateMetaMessageTemplateService = async ({
  connection,
  template,
  variableMapping,
  postExecutor
}: CreateMetaMessageTemplateRequest): Promise<MetaMessageTemplateCreateResponse> => {
  if (
    normalizeProviderType(
      connection.providerType
    ) !== "official"
  ) {
    throw new AppError(
      "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED"
    );
  }

  let normalizedMapping;

  if (variableMapping !== undefined) {
    normalizedMapping =
      ValidateMetaMessageTemplateVariableMappingService({
        template,
        variableMapping,
        requireComplete: true
      });
  }

  const client = new MetaMessageTemplateClient(
    {
      accessToken: connection.accessToken,
      wabaId: connection.wabaId,
      apiVersion: connection.apiVersion
    },
    undefined,
    postExecutor
  );

  const result =
    await client.createTemplate(template);

  if (normalizedMapping) {
    if (
      !connection.id ||
      !template.name ||
      !template.language
    ) {
      throw new AppError(
        "ERR_META_TEMPLATE_VARIABLE_MAPPING_IDENTITY_REQUIRED",
        400
      );
    }

    await SaveMetaMessageTemplateVariableMappingService({
      whatsappId: connection.id,
      templateName: template.name,
      templateLanguage: template.language,
      variableMapping: normalizedMapping
    });
  }

  return result;
};

export default CreateMetaMessageTemplateService;