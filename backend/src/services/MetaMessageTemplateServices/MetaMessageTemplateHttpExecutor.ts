import * as https from "https";
import { URL } from "url";
import AppError from "../../errors/AppError";
import { MetaMessageTemplateGetExecutor } from "./MetaMessageTemplateClient";

export type MetaMessageTemplateHttpsRequest = typeof https.request;

const validateMetaGraphUrl = (url: string): URL => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AppError(
      "ERR_META_TEMPLATE_HTTP_URL_INVALID"
    );
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== "graph.facebook.com"
  ) {
    throw new AppError(
      "ERR_META_TEMPLATE_HTTP_URL_INVALID"
    );
  }

  return parsedUrl;
};

export const createMetaMessageTemplateGetExecutor = (
  requestFactory: MetaMessageTemplateHttpsRequest = https.request
): MetaMessageTemplateGetExecutor => {
  return (
    url: string,
    accessToken: string
  ) =>
    new Promise((resolve, reject) => {
      const parsedUrl = validateMetaGraphUrl(url);

      const request = requestFactory(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || undefined,
          path: `${parsedUrl.pathname}${parsedUrl.search}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
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
};

export const metaMessageTemplateGetExecutor =
  createMetaMessageTemplateGetExecutor();

export default metaMessageTemplateGetExecutor;
