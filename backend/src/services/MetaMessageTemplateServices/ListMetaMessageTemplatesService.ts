import AppError from "../../errors/AppError";
import MetaMessageTemplateVariableMappingModel from "../../models/MetaMessageTemplateVariableMapping";
import MetaMessageTemplateClient, {
  MetaMessageTemplateGetExecutor
} from "./MetaMessageTemplateClient";
import {
  MetaMessageTemplateListResponse,
  MetaMessageTemplateVariableMapping
} from "./types";

export interface MetaMessageTemplateConnectionContext {
  id?: number;
  providerType?: string | null;
  accessToken?: string | null;
  wabaId?: string | null;
  apiVersion?: string | null;
}

interface ListMetaMessageTemplatesRequest {
  connection: MetaMessageTemplateConnectionContext;
  getExecutor: MetaMessageTemplateGetExecutor;
  pagination?: {
    after?: string;
    before?: string;
  };
  includeVariableMappings?: boolean;
}

const normalizeProviderType = (
  providerType?: string | null
): string => {
  return (providerType || "")
    .trim()
    .toLowerCase();
};

const ListMetaMessageTemplatesService = async ({
  connection,
  getExecutor,
  pagination,
  includeVariableMappings = false
}: ListMetaMessageTemplatesRequest): Promise<MetaMessageTemplateListResponse> => {
  if (
    normalizeProviderType(
      connection.providerType
    ) !== "official"
  ) {
    throw new AppError(
      "ERR_META_TEMPLATE_OFFICIAL_CONNECTION_REQUIRED"
    );
  }

  const client = new MetaMessageTemplateClient(
    {
      accessToken: connection.accessToken,
      wabaId: connection.wabaId,
      apiVersion: connection.apiVersion
    },
    getExecutor
  );

  const response =
    await client.listTemplates(pagination);

  if (
    !includeVariableMappings ||
    !connection.id ||
    !Array.isArray(response.data) ||
    response.data.length === 0
  ) {
    return response;
  }

  const storedMappings =
    await MetaMessageTemplateVariableMappingModel.findAll({
      where: {
        whatsappId: connection.id
      },
      order: [
        ["templateName", "ASC"],
        ["templateLanguage", "ASC"],
        ["componentType", "ASC"],
        ["position", "ASC"]
      ]
    });

  const mappingsByTemplate =
    storedMappings.reduce<
      Record<
        string,
        MetaMessageTemplateVariableMapping[]
      >
    >((result, mapping) => {
      const key =
        `${mapping.templateName}:${mapping.templateLanguage}`;

      if (!result[key]) {
        result[key] = [];
      }

      result[key].push({
        componentType: mapping.componentType,
        position: mapping.position,
        variableKey: mapping.variableKey
      });

      return result;
    }, {});

  return {
    ...response,
    data: response.data.map(template => {
      const key =
        `${template.name || ""}:${template.language || ""}`;

      return {
        ...template,
        samachatVariableMapping:
          mappingsByTemplate[key] || []
      };
    })
  };
};

export default ListMetaMessageTemplatesService;