import http from "http";
import https from "https";
import crypto from "crypto";

interface RequestOptions {
  url: string;
  method: string;
  payload: Record<string, unknown>;
  secret?: string | null;
  event: string;
  headers?: Record<string, string> | null;
  attempt?: number;
}

interface ResponseData {
  statusCode: number | null;
  responseBody: string;
  durationMs: number;
  attempted: number;
}

const buildSignature = (payload: string, secret?: string | null): string | null => {
  if (!secret) {
    return null;
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const MAX_RESPONSE_LENGTH = 5000;
const MAX_RETRIES = 1;

const isAllowedProtocol = (protocol: string): boolean => {
  return protocol === "http:" || protocol === "https:";
};

const sendWebhookRequest = ({
  url,
  method,
  payload,
  secret,
  event,
    headers,
  attempt = 0
}: RequestOptions): Promise<ResponseData> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const body = JSON.stringify(payload);
    const signature = buildSignature(body, secret);
    const parsedUrl = new URL(url);

    if (!isAllowedProtocol(parsedUrl.protocol)) {
      reject(new Error("Webhook protocol not allowed"));
      return;
    }

    const mergedHeaders: Record<string, string> = {
      ...(headers || {}),
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString(),
      "User-Agent": "SamaChat-Webhook",
      "X-SamaChat-Event": event,
      ...(signature ? { "X-SamaChat-Signature": signature } : {})
    };


    const options: http.RequestOptions = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      headers: mergedHeaders
    };

    const client = parsedUrl.protocol === "https:" ? https : http;
    const request = client.request(options, response => {
      let responseBody = "";

      response.on("data", chunk => {
        if (responseBody.length < MAX_RESPONSE_LENGTH) {
          responseBody += chunk.toString();
        }
      });

      response.on("end", () => {
        resolve({
          statusCode: response.statusCode || null,
          responseBody,
          durationMs: Date.now() - startTime,
          attempted: attempt + 1
        });
      });
    });

    request.on("error", error => {
      if (attempt < MAX_RETRIES) {
        sendWebhookRequest({
          url,
          method,
          payload,
          secret,
          event,
          headers,
          attempt: attempt + 1
        })
          .then(resolve)
          .catch(reject);
        return;
      }
      reject(error);
    });

    request.setTimeout(8000, () => {
      request.destroy(new Error("Webhook timeout"));
    });

    request.write(body);
    request.end();
  });
};

export default sendWebhookRequest;
