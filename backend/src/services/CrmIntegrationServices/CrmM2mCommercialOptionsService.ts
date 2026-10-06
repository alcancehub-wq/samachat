import { createHmac, randomUUID } from "crypto";
import { request as httpsRequest } from "https";
import AppError from "../../errors/AppError";
import {
  LoadCrmIntegrationMapping
} from "./CrmIntegrationMappingService";
import {
  ResolveCrmM2mSecret
} from "./CrmM2mSecretResolver";
import EnvironmentCrmM2mSecretProvider from "./EnvironmentCrmM2mSecretProvider";

interface CommercialOptionsRequest {
  readonly schema_version: 1;
  readonly request_id: string;
  readonly operation: "get_commercial_options";
  readonly integration_id: string;
  readonly organization_id: string;
  readonly source_system: "samachat";
  readonly source_instance_id: string;
}

export interface CrmM2mCommercialOptions {
  readonly pipelines: ReadonlyArray<{
    readonly name: string;
    readonly stages: ReadonlyArray<{ readonly name: string }>;
    readonly owners: ReadonlyArray<{
      readonly name: string;
      readonly email: string;
    }>;
  }>;
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validText = (
  value: unknown,
  maximum: number
): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximum;

export function ParseCrmM2mCommercialOptions(
  value: unknown,
  organizationId: string
): CrmM2mCommercialOptions {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("CRM_M2M_OPTIONS_INVALID");
  }

  const root = value as Record<string, unknown>;

  if (
    root.schema_version !== 1 ||
    root.organization_id !== organizationId ||
    !Array.isArray(root.pipelines) ||
    root.pipelines.length > 100
  ) {
    throw new Error("CRM_M2M_OPTIONS_INVALID");
  }

  const pipelines = root.pipelines.map(item => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      throw new Error("CRM_M2M_OPTIONS_INVALID");
    }

    const pipeline =
      item as Record<string, unknown>;

    if (
      !validText(pipeline.name, 150) ||
      !Array.isArray(pipeline.stages) ||
      !Array.isArray(pipeline.owners) ||
      pipeline.stages.length > 100 ||
      pipeline.owners.length > 100
    ) {
      throw new Error("CRM_M2M_OPTIONS_INVALID");
    }

    const stages = pipeline.stages.map(stageItem => {
      if (
        !stageItem ||
        typeof stageItem !== "object" ||
        Array.isArray(stageItem)
      ) {
        throw new Error("CRM_M2M_OPTIONS_INVALID");
      }

      const stage =
        stageItem as Record<string, unknown>;

      if (!validText(stage.name, 150)) {
        throw new Error("CRM_M2M_OPTIONS_INVALID");
      }

      return { name: stage.name.trim() };
    });

    const owners = pipeline.owners.map(ownerItem => {
      if (
        !ownerItem ||
        typeof ownerItem !== "object" ||
        Array.isArray(ownerItem)
      ) {
        throw new Error("CRM_M2M_OPTIONS_INVALID");
      }

      const owner =
        ownerItem as Record<string, unknown>;

      if (
        !uuid.test(String(owner.user_id || "")) ||
        !validText(owner.name, 200) ||
        !validText(owner.email, 255) ||
        !String(owner.email).includes("@")
      ) {
        throw new Error("CRM_M2M_OPTIONS_INVALID");
      }

      return {
        name: owner.name.trim(),
        email: owner.email.trim().toLowerCase()
      };
    });

    return {
      name: pipeline.name.trim(),
      stages,
      owners
    };
  });

  return { pipelines };
}

const sendRequest = (
  url: string,
  body: string,
  headers: Readonly<Record<string, string>>
): Promise<{ status: number; body: unknown }> =>
  new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Length":
            Buffer.byteLength(body, "utf8")
        }
      },
      response => {
        const chunks: Buffer[] = [];
        let size = 0;

        response.on("data", (chunk: Buffer) => {
          size += chunk.length;

          if (size > 32768) {
            request.destroy(
              new Error("CRM_M2M_OPTIONS_RESPONSE_LIMIT")
            );
            return;
          }

          chunks.push(chunk);
        });

        response.on("error", reject);

        response.on("end", () => {
          let parsed: unknown = null;

          try {
            parsed = JSON.parse(
              Buffer.concat(chunks)
                .toString("utf8")
            );
          } catch {
            parsed = null;
          }

          resolve({
            status: response.statusCode || 0,
            body: parsed
          });
        });
      }
    );

    const timeout = setTimeout(
      () =>
        request.destroy(
          new Error("CRM_M2M_OPTIONS_TIMEOUT")
        ),
      8000
    );

    request.on(
      "close",
      () => clearTimeout(timeout)
    );

    request.on("error", reject);

    request.end(body);
  });

export default async function GetCrmM2mCommercialOptions(
  integrationId: number
): Promise<CrmM2mCommercialOptions> {
  const mapping =
    await LoadCrmIntegrationMapping(
      integrationId
    );

  if (!mapping) {
    throw new AppError(
      "ERR_CRM_M2M_MAPPING_NOT_FOUND",
      404
    );
  }

  const secret =
    await ResolveCrmM2mSecret(
      mapping.secretReference,
      new EnvironmentCrmM2mSecretProvider()
    );

  const requestId = randomUUID();
  const sentAt = new Date().toISOString();

  const payload: CommercialOptionsRequest = {
    schema_version: 1,
    request_id: requestId,
    operation: "get_commercial_options",
    integration_id:
      mapping.identity.integrationId,
    organization_id:
      mapping.identity.organizationId,
    source_system: "samachat",
    source_instance_id:
      mapping.identity.sourceInstanceId
  };

  const body = JSON.stringify(payload);

  const signature = createHmac(
    "sha256",
    secret
  )
    .update(
      `${sentAt}\n${requestId}\n${body}`,
      "utf8"
    )
    .digest("hex");

  let response: {
    status: number;
    body: unknown;
  };

  try {
    response = await sendRequest(
      mapping.endpoint,
      body,
      {
        "Content-Type": "application/json",
        "X-SamaChat-Signature-Version": "1",
        "X-SamaChat-Key-Id": mapping.keyId,
        "X-SamaChat-Sent-At": sentAt,
        "X-SamaChat-Event-Id": requestId,
        "X-SamaChat-Signature": signature
      }
    );
  } catch {
    throw new AppError(
      "ERR_CRM_M2M_OPTIONS_UNAVAILABLE",
      503
    );
  }

  if (
    response.status < 200 ||
    response.status >= 300
  ) {
    throw new AppError(
      "ERR_CRM_M2M_OPTIONS_UNAVAILABLE",
      503
    );
  }

  try {
    return ParseCrmM2mCommercialOptions(
      response.body,
      mapping.identity.organizationId
    );
  } catch {
    throw new AppError(
      "ERR_CRM_M2M_OPTIONS_INVALID",
      502
    );
  }
}
