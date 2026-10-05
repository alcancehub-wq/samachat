import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import { createRequire } from "module";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";
import { runInThisContext } from "vm";

export const webApi = runInThisContext(
  "({ Request, Response, Headers, crypto })"
) as {
  Request: typeof Request;
  Response: typeof Response;
  Headers: typeof Headers;
  crypto: Crypto;
};

export const crmIdentity = {
  id: "synthetic-integration",
  key_id: "ephemeral-key",
  org_id: "00000000-0000-4000-8000-000000000001",
  source_instance_id: "synthetic-instance",
  active: true
};
export const crmMigrations = [
  "tests/m2m/schema.fixture.sql",
  "supabase/migrations/20261001180000_p03_opportunities_foundation.sql",
  "supabase/migrations/20261001182000_p03_opportunity_root_guards.sql",
  "supabase/migrations/20261001183000_p03_create_opportunity_rpc.sql",
  "supabase/migrations/20261002150000_samachat_m2m_contact_foundation.sql"
] as const;
export const crmExpectedHashes: Record<string, string> = {
  "supabase/functions/samachat-m2m/core.ts":
    "41e153350a5e0d6be6eb7300a385992094015b1ac1ec7a781e7d2a51a71d597e",
  "tests/m2m/schema.fixture.sql":
    "b6464a9b36d7ed4656bde0baa0285526ff0eff26bea1f8d80f668c9f1e5b4e81",
  "supabase/migrations/20261001180000_p03_opportunities_foundation.sql":
    "277af329581d14ac1b66d6d720a8aa49300e7a6d9fa94f36b6379a49f2c60fe6",
  "supabase/migrations/20261001182000_p03_opportunity_root_guards.sql":
    "9f022ca9520688be638007b4ec2cf74b495c8f232aeedce9b4d2e9eb3cee3804",
  "supabase/migrations/20261001183000_p03_create_opportunity_rpc.sql":
    "f3690b78dd5d9ecfa39a101a7c457a2ac078e2caac6fc546ea870e0b220c4605",
  "supabase/migrations/20261002150000_samachat_m2m_contact_foundation.sql":
    "03abb245fcf41844ccbd366cdb8560bec1ce0f39758d91641e498aeb2338e160"
};
type PgResult = { rows: Record<string, any>[] };
export interface CrmLabConnection {
  query(sql: string, values?: readonly unknown[]): Promise<PgResult>;
  end(): Promise<void>;
}
export interface GatewayLab {
  connection: CrmLabConnection;
  handle(request: Request): Promise<Response>;
  connect(): Promise<CrmLabConnection>;
  reset(): Promise<void>;
  rpcCalls: { upsert: number; readback: number };
  copyHashes: Record<string, string>;
}
export async function InitializeCrmIntegratedGatewayLab(
  secret: Uint8Array,
  clock: () => number
): Promise<GatewayLab> {
  if (process.env.CRM_INTEGRATED_LAB_ENABLED !== "1")
    throw new Error("INTEGRATED_LAB_OPT_IN_REQUIRED");
  const base = resolve(
    __dirname,
    "../../../../../node_modules/.cache/r14-integrated-lab"
  );
  const copy = resolve(base, "crm");
  const source = readFileSync(
    resolve(copy, "supabase/functions/samachat-m2m/core.ts"),
    "utf8"
  ).replace(/\r\n/g, "\n");
  const coreHash = createHash("sha256").update(source, "utf8").digest("hex");
  if (coreHash !== crmExpectedHashes["supabase/functions/samachat-m2m/core.ts"])
    throw new Error("CRM_IMMUTABLE_CORE_FINGERPRINT_MISMATCH");
  const generated = transpileModule(source, {
    compilerOptions: {
      target: ScriptTarget.ES2022,
      module: ModuleKind.CommonJS
    }
  }).outputText;
  const loaded: { exports: Record<string, any> } = { exports: {} };
  new Function(
    "exports",
    "require",
    "module",
    "crypto",
    "Request",
    "Response",
    "Headers",
    generated
  )(
    loaded.exports,
    require,
    loaded,
    webApi.crypto,
    webApi.Request,
    webApi.Response,
    webApi.Headers
  );
  const pgModule = process.env.M2M_INTEGRATED_LAB_PG_MODULE;
  if (!pgModule) throw new Error("LOCAL_PG_MODULE_PATH_REQUIRED");
  const pg = createRequire(__filename)(pgModule);
  const options = {
    host: "127.0.0.1",
    port: 55446,
    user: "r14_lab",
    password: "",
    ssl: false
  };
  for (const file of crmMigrations) {
    if (
      createHash("sha256")
        .update(
          readFileSync(resolve(copy, file), "utf8").replace(/\r\n/g, "\n")
        )
        .digest("hex") !== crmExpectedHashes[file]
    )
      throw new Error("CRM_IMMUTABLE_SQL_FINGERPRINT_MISMATCH");
  }
  const validate = async (client: CrmLabConnection, database: string) => {
    const row = (
      await client.query(
        "SELECT current_setting('data_directory') AS directory,current_setting('server_version') AS version,current_database() AS database,host(inet_server_addr()) AS host,inet_server_port() AS port"
      )
    ).rows[0];
    if (
      String(row.directory)
        .replace(/\\/g, "/")
        .replace(/\/$/, "")
        .toLowerCase() !==
        resolve(base, "postgres-data").replace(/\\/g, "/").toLowerCase() ||
      row.version !== "17.7" ||
      row.database !== database ||
      row.host !== "127.0.0.1" ||
      Number(row.port) !== 55446
    )
      throw new Error("REFUSING_NON_R14_POSTGRES_SERVER");
  };
  const admin = new pg.Client({ ...options, database: "postgres" });
  await admin.connect();
  try {
    await validate(admin, "postgres");
    await admin.query("DROP DATABASE IF EXISTS r14_crm_lab");
    await admin.query(
      "DROP ROLE IF EXISTS anon; DROP ROLE IF EXISTS authenticated; DROP ROLE IF EXISTS service_role"
    );
    await admin.query("CREATE DATABASE r14_crm_lab");
  } finally {
    await admin.end();
  }
  const connect = async () => {
    const client = new pg.Client({ ...options, database: "r14_crm_lab" });
    await client.connect();
    try {
      await validate(client, "r14_crm_lab");
      return client as CrmLabConnection;
    } catch (error) {
      await client.end();
      throw error;
    }
  };
  const connection = await connect();
  const copyHashes: Record<string, string> = {
    "supabase/functions/samachat-m2m/core.ts": coreHash
  };
  try {
    for (const file of crmMigrations) {
      const sql = readFileSync(resolve(copy, file), "utf8");
      copyHashes[file] = createHash("sha256")
        .update(sql.replace(/\r\n/g, "\n"))
        .digest("hex");
      await connection.query(sql);
    }
    const rpcCalls = { upsert: 0, readback: 0 };
    const reset = async () => {
      await connection.query(
        "TRUNCATE samachat_m2m_receipts,samachat_m2m_bindings,contacts,samachat_m2m_integrations CASCADE"
      );
      await connection.query(
        "INSERT INTO samachat_m2m_integrations VALUES($1,$2,$3,$4,true)",
        [
          crmIdentity.id,
          crmIdentity.key_id,
          crmIdentity.org_id,
          crmIdentity.source_instance_id
        ]
      );
      rpcCalls.upsert = 0;
      rpcCalls.readback = 0;
    };
    await reset();
    const repository = {
      resolve: async (key: string) =>
        key === crmIdentity.key_id ? { ...crmIdentity, secret } : null,
      process: async (
        integration: { id: string },
        body: unknown,
        hash: string
      ) => {
        rpcCalls.upsert++;
        try {
          return (
            await connection.query(
              "SELECT samachat_m2m_contact_v1($1,$2,$3) AS result",
              [integration.id, body, hash]
            )
          ).rows[0].result;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("M2M_EVENT_PAYLOAD_CONFLICT")
          )
            throw new loaded.exports.GatewayError(
              409,
              "event_payload_conflict"
            );
          throw error;
        }
      },
      read: async (integration: { id: string }, eventId: string) => {
        rpcCalls.readback++;
        return (
          await connection.query(
            "SELECT samachat_m2m_receipt_v1($1,$2) AS result",
            [integration.id, eventId]
          )
        ).rows[0].result;
      }
    };
    return {
      connection,
      connect,
      reset,
      rpcCalls,
      copyHashes,
      handle: loaded.exports.createHandler(repository, clock)
    };
  } catch (error) {
    await connection.end();
    throw error;
  }
}
