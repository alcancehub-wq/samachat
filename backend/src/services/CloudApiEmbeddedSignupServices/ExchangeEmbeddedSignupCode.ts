import * as https from "https";
import { URL } from "url";
import AppError from "../../errors/AppError";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_API_VERSION = "v25.0";

export interface ExchangeEmbeddedSignupCodeInput {
  code: string;
  appId: string;
  appSecret: string;
  apiVersion?: string;
}

export interface EmbeddedSignupTokenResult {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
}

interface MetaOAuthResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface OAuthHttpResponse {
  statusCode: number;
  body: string;
}

export type OAuthRequestExecutor = (
  url: string
) => Promise<OAuthHttpResponse>;

const normalizeRequiredValue = (
  value: string | undefined,
  errorCode: string
): string => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new AppError(errorCode, 400);
  }

  return normalized;
};

const normalizeApiVersion = (apiVersion?: string): string => {
  const normalized = (apiVersion || DEFAULT_API_VERSION).trim();
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
};

export const buildEmbeddedSignupTokenUrl = ({
  code,
  appId,
  appSecret,
  apiVersion
}: ExchangeEmbeddedSignupCodeInput): string => {
  const cleanCode = normalizeRequiredValue(
    code,
    "ERR_EMBEDDED_SIGNUP_CODE_REQUIRED"
  );
  const cleanAppId = normalizeRequiredValue(
    appId,
    "ERR_EMBEDDED_SIGNUP_APP_ID_REQUIRED"
  );
  const cleanAppSecret = normalizeRequiredValue(
    appSecret,
    "ERR_EMBEDDED_SIGNUP_APP_SECRET_REQUIRED"
  );
  const version = normalizeApiVersion(apiVersion);

  const url = new URL(`${GRAPH_BASE_URL}/${version}/oauth/access_token`);
  url.searchParams.set("client_id", cleanAppId);
  url.searchParams.set("client_secret", cleanAppSecret);
  url.searchParams.set("code", cleanCode);

  return url.toString();
};

const defaultRequestExecutor: OAuthRequestExecutor = url =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const request = https.request(
      {
        hostname: parsedUrl.hostname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      },
      response => {
        let responseBody = "";

        response.setEncoding("utf8");
        response.on("data", chunk => {
          responseBody += chunk;
        });

        response.on("end", () => {
          resolve({
            statusCode: response.statusCode || 0,
            body: responseBody
          });
        });
      }
    );

    request.on("error", reject);
    request.end();
  });

const parseResponse = (body: string): MetaOAuthResponse => {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body) as MetaOAuthResponse;
  } catch (_err) {
    throw new AppError(
      "ERR_EMBEDDED_SIGNUP_INVALID_META_RESPONSE",
      502
    );
  }
};

const buildSafeMetaError = (
  statusCode: number,
  response: MetaOAuthResponse
): AppError => {
  const metaCode = response.error?.code;
  const metaSubcode = response.error?.error_subcode;

  const safeParts = [
    "ERR_EMBEDDED_SIGNUP_CODE_EXCHANGE_FAILED",
    `HTTP_${statusCode}`
  ];

  if (typeof metaCode === "number") {
    safeParts.push(`META_${metaCode}`);
  }

  if (typeof metaSubcode === "number") {
    safeParts.push(`SUB_${metaSubcode}`);
  }

  return new AppError(safeParts.join(":"), 502);
};

const ExchangeEmbeddedSignupCode = async (
  input: ExchangeEmbeddedSignupCodeInput,
  requestExecutor: OAuthRequestExecutor = defaultRequestExecutor
): Promise<EmbeddedSignupTokenResult> => {
  const url = buildEmbeddedSignupTokenUrl(input);

  let httpResponse: OAuthHttpResponse;

  try {
    httpResponse = await requestExecutor(url);
  } catch (_err) {
    throw new AppError(
      "ERR_EMBEDDED_SIGNUP_META_UNAVAILABLE",
      502
    );
  }

  const response = parseResponse(httpResponse.body);

  if (
    httpResponse.statusCode < 200 ||
    httpResponse.statusCode >= 300 ||
    response.error
  ) {
    throw buildSafeMetaError(httpResponse.statusCode, response);
  }

  const accessToken =
    typeof response.access_token === "string"
      ? response.access_token.trim()
      : "";

  if (!accessToken) {
    throw new AppError(
      "ERR_EMBEDDED_SIGNUP_ACCESS_TOKEN_MISSING",
      502
    );
  }

  return {
    accessToken,
    tokenType: response.token_type,
    expiresIn: response.expires_in
  };
};

export default ExchangeEmbeddedSignupCode;
