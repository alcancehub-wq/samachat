import AppError from "../../errors/AppError";
import MetaMessageTemplateClient, {
  MetaMessageTemplateGetExecutor
} from "./MetaMessageTemplateClient";
import { MetaMessageTemplateListResponse } from "./types";

export interface MetaMessageTemplateConnectionContext {
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
}

const normalizeProviderType = (
  providerType?: string | null
): string => {
  return (providerType || "").trim().toLowerCase();
};

const ListMetaMessageTemplatesService = async ({
  connection,
  getExecutor,
  pagination
}: ListMetaMessageTemplatesRequest): Promise<MetaMessageTemplateListResponse> => {
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
    getExecutor
  );

  return client.listTemplates(pagination);
};

export default ListMetaMessageTemplatesService;
