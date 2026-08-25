import * as https from "https";
import { URL } from "url";
import AppError from "../../errors/AppError";
import {
  CloudApiCredentials,
  CloudApiErrorPayload,
  CloudApiHttpResponse,
  CloudApiMediaMessageInput,
  CloudApiMediaUploadInput,
  CloudApiMediaUploadResult,
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

export const buildCloudApiMediaUrl = (
  phoneNumberId: string,
  apiVersion?: string | null
): string => {
  const cleanPhoneNumberId = sanitizePhoneNumberId(phoneNumberId);

  if (!cleanPhoneNumberId) {
    throw new AppError("ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED");
  }

  const version = normalizeApiVersion(apiVersion);
  return `${GRAPH_BASE_URL}/${version}/${cleanPhoneNumberId}/media`;
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

  async uploadMedia(
    input: CloudApiMediaUploadInput
  ): Promise<CloudApiMediaUploadResult> {
    const accessToken = sanitizeAccessToken(this.credentials.accessToken);
    const phoneNumberId = sanitizePhoneNumberId(this.credentials.phoneNumberId);

    if (!accessToken) {
      throw new AppError("ERR_CLOUD_API_ACCESS_TOKEN_REQUIRED");
    }

    if (!phoneNumberId) {
      throw new AppError("ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED");
    }

    if (!input.data || input.data.length === 0) {
      throw new AppError("ERR_CLOUD_API_MEDIA_REQUIRED");
    }

    const cleanFilename = (input.filename || "media")
      .replace(/["\r\n]/g, "");

    const cleanMimeType = (input.mimetype || "application/octet-stream")
      .replace(/[\r\n]/g, "");

    const boundary =
      `----samachat-cloud-media-${Date.now().toString(16)}`;

    const prefix = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="messaging_product"\r\n\r\n` +
        `whatsapp\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${cleanFilename}"\r\n` +
        `Content-Type: ${cleanMimeType}\r\n\r\n`
    );

    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const requestBody = Buffer.concat([prefix, input.data, suffix]);

    const url = buildCloudApiMediaUrl(
      phoneNumberId,
      this.credentials.apiVersion
    );

    const parsedUrl = new URL(url);

    const response = await new Promise<CloudApiHttpResponse>(
      (resolve, reject) => {
        const request = https.request(
          {
            hostname: parsedUrl.hostname,
            path: `${parsedUrl.pathname}${parsedUrl.search}`,
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": `multipart/form-data; boundary=${boundary}`,
              "Content-Length": requestBody.length
            }
          },
          responseMessage => {
            let responseBody = "";

            responseMessage.setEncoding("utf8");

            responseMessage.on("data", chunk => {
              responseBody += chunk;
            });

            responseMessage.on("end", () => {
              resolve({
                statusCode: responseMessage.statusCode || 0,
                body: responseBody
              });
            });
          }
        );

        request.on("error", reject);
        request.write(requestBody);
        request.end();
      }
    );

    const parsedBody = parseResponseBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new AppError(
        buildCloudApiErrorMessage(response.statusCode, parsedBody)
      );
    }

    return parsedBody as CloudApiMediaUploadResult;
  }

  async sendMedia(
    input: CloudApiMediaMessageInput
  ): Promise<CloudApiMessageResult> {
    const accessToken = sanitizeAccessToken(this.credentials.accessToken);
    const phoneNumberId = sanitizePhoneNumberId(this.credentials.phoneNumberId);
    const cleanTo = (input.to || "").replace(/\D/g, "");

    if (!accessToken) {
      throw new AppError("ERR_CLOUD_API_ACCESS_TOKEN_REQUIRED");
    }

    if (!phoneNumberId) {
      throw new AppError("ERR_CLOUD_API_PHONE_NUMBER_ID_REQUIRED");
    }

    if (!cleanTo) {
      throw new AppError("ERR_CLOUD_API_TO_REQUIRED");
    }

    if (!input.mediaId) {
      throw new AppError("ERR_CLOUD_API_MEDIA_ID_REQUIRED");
    }

    const mediaObject: Record<string, unknown> = {
      id: input.mediaId
    };

    if (
      input.caption &&
      (input.type === "image" ||
        input.type === "video" ||
        input.type === "document")
    ) {
      mediaObject.caption = input.caption;
    }

    if (input.type === "document" && input.filename) {
      mediaObject.filename = input.filename;
    }

    if (input.type === "audio" && input.voice === true) {
      mediaObject.voice = true;
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: input.type,
      [input.type]: mediaObject
    };

    const url = buildCloudApiMessagesUrl(
      phoneNumberId,
      this.credentials.apiVersion
    );

    const response = await this.requestExecutor(
      url,
      accessToken,
      payload
    );

    const parsedBody = parseResponseBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new AppError(
        buildCloudApiErrorMessage(response.statusCode, parsedBody)
      );
    }

    return parsedBody as CloudApiMessageResult;
  }
}

export default CloudApiClient;
