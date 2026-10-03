import { DataTypes, QueryTypes, Sequelize } from "sequelize";

const directory =
  "D:/Samacon/worktrees/samachat-crm-p02-r15-reconciled-20261003/backend/node_modules/.cache/r15-reconciled-lab/data/";
export const readinessDatabaseName = "r15_reconciled_lab";
export interface ReadinessLab {
  readonly database: Sequelize;
  readonly diagnostic: Sequelize;
  readonly statements: string[];
  guard(): Promise<void>;
  restore(hardened?: boolean): Promise<void>;
  mutate(sql: string, replacements?: Record<string, unknown>): Promise<unknown>;
  bytes(
    table: "CrmOriginJournals" | "CrmOriginCaptureCommands",
    key: string
  ): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}
function check(
  row: Record<string, unknown>,
  databaseName: string | null
): void {
  if (
    String(row.directory).replace(/\\/g, "/").toLowerCase() !==
      directory.toLowerCase() ||
    !String(row.version).startsWith("10.11.10-MariaDB") ||
    Number(row.port) !== 55449 ||
    row.host !== "127.0.0.1" ||
    row.databaseName !== databaseName
  )
    throw new Error("REFUSING_NON_R15_READINESS_DATABASE");
}
const metadata =
  "SELECT @@datadir AS directory,VERSION() AS version,@@port AS port,@@bind_address AS host,DATABASE() AS databaseName";
export async function InitializeCrmReadinessLab(): Promise<ReadinessLab> {
  if (process.env.CRM_READINESS_RECONCILED_LAB_ENABLED !== "1")
    throw new Error("R15_LAB_OPT_IN_REQUIRED");
  const admin = await require("mysql2/promise").createConnection({
    host: "127.0.0.1",
    port: 55449,
    user: "root",
    password: ""
  });
  try {
    const [rows] = await admin.query(metadata);
    check(rows[0], null);
    await admin.query(
      "CREATE DATABASE IF NOT EXISTS r15_reconciled_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_bin"
    );
  } finally {
    await admin.end();
  }
  const database = new Sequelize(readinessDatabaseName, "root", "", {
    host: "127.0.0.1",
    port: 55449,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    logging: false
  });
  const independent = await require("mysql2/promise").createConnection({
    host: "127.0.0.1",
    port: 55449,
    user: "root",
    password: "",
    database: readinessDatabaseName
  });
  const guard = async () => {
    const [independentRows] = await independent.query(metadata);
    check(independentRows[0], readinessDatabaseName);
    const rows = await database.query<Record<string, unknown>>(metadata, {
      type: QueryTypes.SELECT
    });
    if (rows.length !== 1) throw new Error("R15_METADATA_UNAVAILABLE");
    check(rows[0], readinessDatabaseName);
  };
  const mutate = async (
    sql: string,
    replacements: Record<string, unknown> = {}
  ) => {
    await guard();
    return database.query(sql, { replacements });
  };
  const restore = async (hardened = true) => {
    await guard();
    for (const table of [
      "CrmOriginJournals",
      "CrmOriginCaptureCommands",
      "ContactCustomFields",
      "ContactTags",
      "Contacts"
    ])
      await mutate(`DROP TABLE IF EXISTS ${table}`);
    const query = database.getQueryInterface();
    const stamp = { type: DataTypes.DATE, allowNull: false };
    await guard();
    await query.createTable(
      "Contacts",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        name: DataTypes.STRING,
        number: DataTypes.STRING,
        lid: DataTypes.STRING,
        email: { type: DataTypes.STRING, allowNull: false, defaultValue: "" },
        isGroup: DataTypes.BOOLEAN,
        captureChannel: DataTypes.STRING,
        createdAt: stamp,
        updatedAt: stamp
      },
      { engine: "InnoDB" }
    );
    await guard();
    await query.createTable(
      "ContactCustomFields",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        contactId: DataTypes.INTEGER,
        name: DataTypes.STRING,
        value: DataTypes.STRING,
        createdAt: stamp,
        updatedAt: stamp
      },
      { engine: "InnoDB" }
    );
    await guard();
    await query.createTable(
      "ContactTags",
      {
        contactId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          allowNull: false
        },
        tagId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
        createdAt: stamp,
        updatedAt: stamp
      },
      { engine: "InnoDB" }
    );
    await guard();
    await require("../../../../database/migrations/20261002173000-create-crm-origin-journal").up(
      query
    );
    if (hardened) {
      await guard();
      await require("../../../../database/migrations/20261003125100-harden-crm-origin-immutability").up(
        query
      );
    }
  };
  const bytes = async (
    table: "CrmOriginJournals" | "CrmOriginCaptureCommands",
    key: string
  ) => {
    await guard();
    const [fields] = await independent.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION",
      [readinessDatabaseName, table.toLowerCase()]
    );
    const projection = fields
      .map(
        (field: { COLUMN_NAME: string }) =>
          `HEX(CAST(\`${field.COLUMN_NAME}\` AS BINARY)) AS \`${field.COLUMN_NAME}\``
      )
      .join(",");
    if (!projection) throw new Error("R15_INDEPENDENT_COLUMNS_MISSING");
    const [rows] = await independent.query(
      `SELECT ${projection} FROM ${table} WHERE ${
        table === "CrmOriginJournals" ? "eventId" : "captureKey"
      }=?`,
      [key]
    );
    if (rows.length !== 1) throw new Error("R15_INDEPENDENT_ROW_MISSING");
    return rows[0] as Record<string, unknown>;
  };
  const statements: string[] = [];
  const diagnostic = {
    query: (sql: string, options: Record<string, unknown>) => {
      if (!/^SELECT\b/.test(sql))
        throw new Error("R15_DIAGNOSTIC_QUERY_FORBIDDEN");
      statements.push(sql);
      return database.query(sql, options);
    }
  } as unknown as Sequelize;
  try {
    await guard();
    return {
      database,
      diagnostic,
      statements,
      guard,
      restore,
      mutate,
      bytes,
      close: async () => {
        await independent.end();
        await database.close();
      }
    };
  } catch (error) {
    await independent.end();
    await database.close();
    throw error;
  }
}
