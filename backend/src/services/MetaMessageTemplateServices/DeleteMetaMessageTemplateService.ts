import AppError from "../../errors/AppError";
import MetaMessageTemplateClient, {
  MetaMessageTemplateDeleteExecutor
} from "./MetaMessageTemplateClient";
import { MetaMessageTemplateDeleteResponse } from "./types";
import { MetaMessageTemplateConnectionContext } from "./ListMetaMessageTemplatesService";

interface DeleteMetaMessageTemplateRequest {
  connection: MetaMessageTemplateConnectionContext;
  name: string;
  deleteExecutor: MetaMessageTemplateDeleteExecutor;
}

const normalizeProviderType = (
  providerType?: string | null
): string => {
  return (providerType || "").trim().toLowerCase();
};

const DeleteMetaMessageTemplateService = async ({
  connection,
  name,
  deleteExecutor
}: DeleteMetaMessageTemplateRequest): Promise<MetaMessageTemplateDeleteResponse> => {
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
    undefined,
    deleteExecutor
  );

  return client.deleteTemplate(name);
};

export default DeleteMetaMessageTemplateService;