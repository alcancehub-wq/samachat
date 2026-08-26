import AppError from "../../errors/AppError";
import { MetaMessageTemplateCredentials } from "./types";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_API_VERSION = "v20.0";

const normalizeApiVersion = (
  apiVersion?: string | null
): string => {
  const value = (apiVersion || DEFAULT_API_VERSION).trim();

  return value.startsWith("v")
    ? value
    : `v${value}`;
};

const sanitizeWabaId = (
  wabaId?: string | null
): string => {
  return (wabaId || "").trim();
};

const sanitizeAccessToken = (
  accessToken?: string | null
): string => {
  return (accessToken || "").trim();
};

export const buildMetaMessageTemplatesUrl = (
  wabaId: string,
  apiVersion?: string | null
): string => {
  const cleanWabaId = sanitizeWabaId(wabaId);

  if (!cleanWabaId) {
    throw new AppError("ERR_META_TEMPLATE_WABA_ID_REQUIRED");
  }

  const version = normalizeApiVersion(apiVersion);

  return (
    `${GRAPH_BASE_URL}/${version}/` +
    `${encodeURIComponent(cleanWabaId)}/message_templates`
  );
};

export class MetaMessageTemplateClient {
  private readonly credentials: MetaMessageTemplateCredentials;

  constructor(
    credentials: MetaMessageTemplateCredentials
  ) {
    this.credentials = credentials;
  }

  getTemplatesUrl(): string {
    const wabaId = sanitizeWabaId(
      this.credentials.wabaId
    );

    const accessToken = sanitizeAccessToken(
      this.credentials.accessToken
    );

    if (!accessToken) {
      throw new AppError(
        "ERR_META_TEMPLATE_ACCESS_TOKEN_REQUIRED"
      );
    }

    if (!wabaId) {
      throw new AppError(
        "ERR_META_TEMPLATE_WABA_ID_REQUIRED"
      );
    }

    return buildMetaMessageTemplatesUrl(
      wabaId,
      this.credentials.apiVersion
    );
  }
}

export default MetaMessageTemplateClient;
