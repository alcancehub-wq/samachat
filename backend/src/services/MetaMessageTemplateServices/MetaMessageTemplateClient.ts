import AppError from "../../errors/AppError";
import {
  MetaMessageTemplateCredentials,
  MetaMessageTemplate,
  MetaMessageTemplateCreateResponse,
  MetaMessageTemplateDeleteResponse,
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


const parseCreateResponse = (
  body: string
): MetaMessageTemplateCreateResponse => {
  try {
    const parsed = JSON.parse(body || "{}");

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("invalid response");
    }

    const response = parsed as {
      id?: unknown;
      status?: unknown;
      category?: unknown;
    };

    return {
      id:
        typeof response.id === "string"
          ? response.id
          : undefined,
      status:
        typeof response.status === "string"
          ? response.status
          : undefined,
      category:
        typeof response.category === "string"
          ? response.category
          : undefined
    };
  } catch {
    throw new AppError(
      "ERR_META_TEMPLATE_INVALID_RESPONSE"
    );
  }
};

const parseDeleteResponse = (
  body: string
): MetaMessageTemplateDeleteResponse => {
  try {
    const parsed = JSON.parse(body || "{}");

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      throw new Error("invalid response");
    }

    const response = parsed as {
      success?: unknown;
    };

    if (typeof response.success !== "boolean") {
      throw new Error("invalid response");
    }

    return {
      success: response.success
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
  private readonly postExecutor?: MetaMessageTemplatePostExecutor;
  private readonly deleteExecutor?: MetaMessageTemplateDeleteExecutor;

  constructor(
    credentials: MetaMessageTemplateCredentials,
    getExecutor?: MetaMessageTemplateGetExecutor,
    postExecutor?: MetaMessageTemplatePostExecutor,
    deleteExecutor?: MetaMessageTemplateDeleteExecutor
  ) {
    this.credentials = credentials;
    this.getExecutor = getExecutor;
    this.postExecutor = postExecutor;
    this.deleteExecutor = deleteExecutor;
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


  async createTemplate(
    template: MetaMessageTemplate
  ): Promise<MetaMessageTemplateCreateResponse> {
    if (!this.postExecutor) {
      throw new AppError(
        "ERR_META_TEMPLATE_POST_EXECUTOR_REQUIRED"
      );
    }

    const {
      accessToken,
      url
    } = this.getValidatedContext();

    const response = await this.postExecutor(
      url,
      accessToken,
      JSON.stringify(template)
    );

    if (
      response.statusCode < 200 ||
      response.statusCode >= 300
    ) {
      throw new AppError(
        `ERR_META_TEMPLATE_CREATE_FAILED: ${response.statusCode}`
      );
    }

    return parseCreateResponse(response.body);
  }

  async deleteTemplate(
    name: string
  ): Promise<MetaMessageTemplateDeleteResponse> {
    if (!this.deleteExecutor) {
      throw new AppError(
        "ERR_META_TEMPLATE_DELETE_EXECUTOR_REQUIRED"
      );
    }

    const cleanName = (name || "").trim();

    if (!cleanName) {
      throw new AppError(
        "ERR_META_TEMPLATE_NAME_REQUIRED"
      );
    }

    const {
      accessToken,
      url
    } = this.getValidatedContext();

    const deleteUrl =
      `${url}?name=${encodeURIComponent(cleanName)}`;

    const response = await this.deleteExecutor(
      deleteUrl,
      accessToken
    );

    if (
      response.statusCode < 200 ||
      response.statusCode >= 300
    ) {
      throw new AppError(
        `ERR_META_TEMPLATE_DELETE_FAILED: ${response.statusCode}`
      );
    }

    return parseDeleteResponse(response.body);
  }
  async listTemplates(
    params: {
      after?: string;
      before?: string;
    } = {}
  ): Promise<MetaMessageTemplateListResponse> {
    if (!this.getExecutor) {
      throw new AppError(
        "ERR_META_TEMPLATE_GET_EXECUTOR_REQUIRED"
      );
    }

    const cleanAfter = (params.after || "").trim();
    const cleanBefore = (params.before || "").trim();

    if (cleanAfter && cleanBefore) {
      throw new AppError(
        "ERR_META_TEMPLATE_PAGINATION_CURSOR_AMBIGUOUS"
      );
    }

    const {
      accessToken,
      url
    } = this.getValidatedContext();

    const listUrl = cleanAfter
      ? `${url}?after=${encodeURIComponent(cleanAfter)}`
      : cleanBefore
        ? `${url}?before=${encodeURIComponent(cleanBefore)}`
        : url;

    const response = await this.getExecutor(
      listUrl,
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
