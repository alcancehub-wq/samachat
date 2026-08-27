import AppError from "../../errors/AppError";
import MetaMessageTemplateClient, {
  MetaMessageTemplatePostExecutor
} from "./MetaMessageTemplateClient";
import {
  MetaMessageTemplate,
  MetaMessageTemplateCreateResponse
} from "./types";
import { MetaMessageTemplateConnectionContext } from "./ListMetaMessageTemplatesService";

interface CreateMetaMessageTemplateRequest {
  connection: MetaMessageTemplateConnectionContext;
  template: MetaMessageTemplate;
  postExecutor: MetaMessageTemplatePostExecutor;
}

const normalizeProviderType = (
  providerType?: string | null
): string => {
  return (providerType || "").trim().toLowerCase();
};

const CreateMetaMessageTemplateService = async ({
  connection,
  template,
  postExecutor
}: CreateMetaMessageTemplateRequest): Promise<MetaMessageTemplateCreateResponse> => {
  if (
    normalizeProviderType(connection.providerType) !==
    "official"
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
    undefined,
    postExecutor
  );

  return client.createTemplate(template);
};

export default CreateMetaMessageTemplateService;