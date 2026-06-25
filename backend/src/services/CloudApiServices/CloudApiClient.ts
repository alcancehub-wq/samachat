import * as https from "https";
import { URL } from "url";
import AppError from "../../errors/AppError";
import {
  CloudApiCredentials,
  CloudApiErrorPayload,
  CloudApiHttpResponse,
  CloudApiMessageResult,
  CloudApiTextMessageInput
} from "./types";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_API_VERSION = "v20.0";

type CloudApiRequestExecutor = (
  url: string,
  accessToken: string,
  payload: unknown
) => Promise<CloudApiHttpResponse>;

const normalizeApiVersion = (apiVersion?: string | null): string => {
  const value = (apiVersion || DEFAULT_API_VERSION).trim();
  return value.startsWith("v") ? value : `v${value}`;
};

const sanitizePhoneNumberId = (phoneNumberId?: string | null): string => {
  return (phoneNumberId || "").trim();
};

const sanitizeAccessToken = (accessToken?: string | null): string => {
  return (accessToken || "").trim();
};

export const buildCloudApiMessagesUrl = (
  phoneNumberId: string,
  apiVersion?: string | null
): string => {
  const cleanPhoneNumberId = sanitizePhoneNumberId(phoneNumberId);

  if (!cleanPhoneNumberId) {
    throw new AppError("ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED");
  }

  const version = normalizeApiVersion(apiVersion);
  return `${GRAPH_BASE_URL}/${version}/${cleanPhoneNumberId}/messages`;
};

export const buildCloudApiTextPayload = ({
  to,
  body,
  previewUrl = false
}: CloudApiTextMessageInput): Record<string, unknown> => {
  const cleanTo = (to || "").replace(/\D/g, "");
  const cleanBody = (body || "").trim();

  if (!cleanTo) {
    throw new AppError("ERR_CLOUD_API_TO_REQUIRED");
  }

  if (!cleanBody) {
    throw new AppError("ERR_CLOUD_API_BODY_REQUIRED");
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      preview_url: previewUrl,
      body: cleanBody
    }
  };
};

const defaultRequestExecutor: CloudApiRequestExecutor = (
  url,
  accessToken,
  payload
) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = JSON.stringify(payload);

    const request = https.request(
      {
        hostname: parsedUrl.hostname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
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
    request.write(body);
    request.end();
  });

const parseResponseBody = (body: string): unknown => {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (err) {
    return { raw: body };
  }
};

const buildCloudApiErrorMessage = (
  statusCode: number,
  parsedBody: unknown
): string => {
  const payload = parsedBody as CloudApiErrorPayload;
  const metaMessage = payload?.error?.message;

  if (metaMessage) {
    return `ERR_CLOUD_API_REQUEST_FAILED: ${statusCode} - ${metaMessage}`;
  }

  return `ERR_CLOUD_API_REQUEST_FAILED: ${statusCode}`;
};

export class CloudApiClient {
  private readonly credentials: CloudApiCredentials;
  private readonly requestExecutor: CloudApiRequestExecutor;

  constructor(
    credentials: CloudApiCredentials,
    requestExecutor: CloudApiRequestExecutor = defaultRequestExecutor
  ) {
    this.credentials = credentials;
    this.requestExecutor = requestExecutor;
  }

  async sendText(
    input: CloudApiTextMessageInput
  ): Promise<CloudApiMessageResult> {
    const accessToken = sanitizeAccessToken(this.credentials.accessToken);
    const phoneNumberId = sanitizePhoneNumberId(this.credentials.phoneNumberId);

    if (!accessToken) {
      throw new AppError("ERR_CLOUD_API_ACCESS_TOKEN_REQUIRED");
    }

    if (!phoneNumberId) {
      throw new AppError("ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED");
    }

    const url = buildCloudApiMessagesUrl(
      phoneNumberId,
      this.credentials.apiVersion
    );
    const payload = buildCloudApiTextPayload(input);
    const response = await this.requestExecutor(url, accessToken, payload);
    const parsedBody = parseResponseBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new AppError(buildCloudApiErrorMessage(response.statusCode, parsedBody));
    }

    return parsedBody as CloudApiMessageResult;
  }
}

export default CloudApiClient;
