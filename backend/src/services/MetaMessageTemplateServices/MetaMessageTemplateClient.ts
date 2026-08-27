import AppError from "../../errors/AppError";
import {
  MetaMessageTemplateCredentials,
  MetaMessageTemplateHttpResponse,
  MetaMessageTemplateListResponse
} from "./types";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_API_VERSION = "v20.0";

export type MetaMessageTemplateGetExecutor = (
  url: string,
  accessToken: string
) => Promise<MetaMessageTemplateHttpResponse>;

export type MetaMessageTemplatePostExecutor = (
  url: string,
  accessToken: string,
  body: string
) => Promise<MetaMessageTemplateHttpResponse>;

export type MetaMessageTemplateDeleteExecutor = (
  url: string,
  accessToken: string
) => Promise<MetaMessageTemplateHttpResponse>;

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

const parseListResponse = (
  body: string
): MetaMessageTemplateListResponse => {
  try {
    const parsed = JSON.parse(body || "{}");

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("invalid response");
    }

    const response =
      parsed as MetaMessageTemplateListResponse & {
        paging?: {
          cursors?: {
            before?: unknown;
            after?: unknown;
          };
        };
      };

    const before =
      typeof response.paging?.cursors?.before === "string"
        ? response.paging.cursors.before
        : undefined;

    const after =
      typeof response.paging?.cursors?.after === "string"
        ? response.paging.cursors.after
        : undefined;

    return {
      data: Array.isArray(response.data)
        ? response.data
        : undefined,
      paging:
        before || after
          ? {
              cursors: {
                ...(before ? { before } : {}),
                ...(after ? { after } : {})
              }
            }
          : undefined
    };
  } catch {
    throw new AppError(
      "ERR_META_TEMPLATE_INVALID_RESPONSE"
    );
  }
};

export const buildMetaMessageTemplatesUrl = (
  wabaId: string,
  apiVersion?: string | null
): string => {
  const cleanWabaId = sanitizeWabaId(wabaId);

  if (!cleanWabaId) {
    throw new AppError(
      "ERR_META_TEMPLATE_WABA_ID_REQUIRED"
    );
  }

  const version = normalizeApiVersion(apiVersion);

  return (
    `${GRAPH_BASE_URL}/${version}/` +
    `${encodeURIComponent(cleanWabaId)}/message_templates`
  );
};

export class MetaMessageTemplateClient {
  private readonly credentials: MetaMessageTemplateCredentials;
  private readonly getExecutor?: MetaMessageTemplateGetExecutor;

  constructor(
    credentials: MetaMessageTemplateCredentials,
    getExecutor?: MetaMessageTemplateGetExecutor
  ) {
    this.credentials = credentials;
    this.getExecutor = getExecutor;
  }

  private getValidatedContext(): {
    accessToken: string;
    url: string;
  } {
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

    return {
      accessToken,
      url: buildMetaMessageTemplatesUrl(
        wabaId,
        this.credentials.apiVersion
      )
    };
  }

  getTemplatesUrl(): string {
    return this.getValidatedContext().url;
  }

  async listTemplates(): Promise<MetaMessageTemplateListResponse> {
    if (!this.getExecutor) {
      throw new AppError(
        "ERR_META_TEMPLATE_GET_EXECUTOR_REQUIRED"
      );
    }

    const {
      accessToken,
      url
    } = this.getValidatedContext();

    const response = await this.getExecutor(
      url,
      accessToken
    );

    if (
      response.statusCode < 200 ||
      response.statusCode >= 300
    ) {
      throw new AppError(
        `ERR_META_TEMPLATE_LIST_FAILED: ${response.statusCode}`
      );
    }

    return parseListResponse(response.body);
  }
}

export default MetaMessageTemplateClient;
